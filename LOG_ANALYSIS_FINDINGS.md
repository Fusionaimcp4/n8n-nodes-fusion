# Log Analysis: ChatGPT vs N8N-node-fusion Tool Calls

**Date:** 2025-01-27  
**Purpose:** Compare actual execution logs to identify format differences

---

## Log Comparison

### ChatGPT (n8n OpenAI Chat Model) - WORKING
```json
{
  "response": {
    "text": "",
    "tool_calls": [
      {
        "id": "call_qEtJy34fhCcMQ3gk4AqWx31M",
        "name": "Book_calendar_events",
        "args": {
          "addMeetLink": true,
          "attendees": ["yilakb@gmail.com"],
          "description": "Booked from Voxe",
          "end": "2025-12-17T14:15:00Z",
          "start": "2025-12-17T14:00:00Z",
          "title": "Consultation with muddy-dew-124"
        }
      }
    ]
  }
}
```

### N8N-node-fusion - FAILING
```json
{
  "response": {
    "text": "",
    "tool_calls": [
      {
        "id": "call_dV7Md0XpykpSw6QcwZEpf7eV",
        "name": "Book_calendar_events",
        "args": {
          "addMeetLink": true,
          "attendees": ["yilakb@gmail.com"],
          "description": "Booked from Voxe",
          "end": "2025-12-18T14:45:00Z",
          "start": "2025-12-18T14:30:00Z",
          "title": "Consultation with floral-voice-257"
        }
      }
    ]
  }
}
```

---

## Critical Finding: Structure Appears Identical

**Observation:** Both logs show identical structure:
- `args` is an object (not a string) ✅
- Same field names (`id`, `name`, `args`) ✅
- Same nested structure ✅
- `args` contains proper JavaScript types (boolean, string, array) ✅

**Conclusion:** The issue is NOT in the raw Fusion response format. The structure matches what ChatGPT returns.

---

## Hypothesis: LangChain AIMessage Processing

Since the raw structures are identical, the problem likely occurs **during or after** LangChain's `AIMessage` constructor processes the tool calls.

### Possible Issues:

1. **AIMessage Internal Storage:**
   - LangChain's `AIMessage` may store `tool_calls` in a different format internally
   - When n8n's AI Agent extracts tool calls, it might get a different structure than expected
   - n8n's OpenAI Chat Model might return tool calls in a format that n8n's AI Agent expects directly

2. **Property Descriptors:**
   - LangChain might wrap tool calls in getters/setters
   - n8n's AI Agent might access properties differently than expected
   - Plain objects vs. class instances

3. **Serialization/Deserialization:**
   - LangChain might serialize tool calls when storing in AIMessage
   - When n8n extracts them, they might be in a different state
   - JSON.stringify in logs might hide the actual runtime structure

---

## What We Need to Investigate

### 1. Runtime Type Checking

Add logging to check actual runtime types:

```typescript
// After creating AIMessage
console.log('[FusionChatModel] AIMessage tool_calls type:', typeof message.tool_calls);
console.log('[FusionChatModel] AIMessage tool_calls isArray:', Array.isArray(message.tool_calls));
console.log('[FusionChatModel] First tool call type:', typeof message.tool_calls[0]);
console.log('[FusionChatModel] First tool call args type:', typeof message.tool_calls[0]?.args);
console.log('[FusionChatModel] First tool call args constructor:', message.tool_calls[0]?.args?.constructor?.name);
```

### 2. Compare AIMessage Output

Log what LangChain's AIMessage actually contains:

```typescript
// After creating AIMessage
console.log('[FusionChatModel] AIMessage.tool_calls:', message.tool_calls);
console.log('[FusionChatModel] AIMessage.tool_calls JSON:', JSON.stringify(message.tool_calls, null, 2));
console.log('[FusionChatModel] AIMessage.tool_calls[0].args:', message.tool_calls[0]?.args);
console.log('[FusionChatModel] AIMessage.tool_calls[0].args JSON:', JSON.stringify(message.tool_calls[0]?.args, null, 2));
```

### 3. Check n8n's AI Agent Extraction

The issue might be in how n8n's AI Agent extracts tool calls from the AIMessage. We need to understand:
- How does n8n's AI Agent access `message.tool_calls`?
- Does it use a specific method or property?
- Does it expect a specific class instance or plain object?

---

## Revised Root Cause Hypothesis

**Original Hypothesis (INCORRECT):**
- Fusion returns `args` as JSON strings
- Need to parse strings to objects

**Revised Hypothesis (LIKELY):**
- Fusion returns correct structure (confirmed by logs)
- LangChain's `AIMessage` constructor processes tool calls in a way that changes their structure
- n8n's AI Agent expects tool calls in a specific format that differs from what LangChain's AIMessage provides
- n8n's OpenAI Chat Model might bypass LangChain's AIMessage or process it differently

---

## Next Steps

1. **Add Runtime Type Logging:**
   - Log actual types after AIMessage creation
   - Compare with what n8n's OpenAI Chat Model provides

2. **Inspect AIMessage Internals:**
   - Check if LangChain wraps tool calls
   - Check if properties are getters/setters
   - Check if serialization occurs

3. **Compare with n8n's OpenAI Chat Model:**
   - How does it create the AIMessage?
   - Does it transform tool calls after creation?
   - Does it use a different LangChain version or configuration?

4. **Test Tool Call Extraction:**
   - Manually extract tool calls from AIMessage
   - Compare structure with what n8n expects
   - Identify any differences

---

## Code Changes Needed

### Add Diagnostic Logging

```typescript
// After line 186 (after AIMessage creation)
console.log('[FusionChatModel] AIMessage created');
console.log('[FusionChatModel] AIMessage.tool_calls type:', typeof message.tool_calls);
console.log('[FusionChatModel] AIMessage.tool_calls length:', message.tool_calls?.length);
if (message.tool_calls && message.tool_calls.length > 0) {
  console.log('[FusionChatModel] First tool call:', message.tool_calls[0]);
  console.log('[FusionChatModel] First tool call args type:', typeof message.tool_calls[0].args);
  console.log('[FusionChatModel] First tool call args:', message.tool_calls[0].args);
  console.log('[FusionChatModel] First tool call args keys:', Object.keys(message.tool_calls[0].args || {}));
}
```

### Potential Fix: Normalize After AIMessage Creation

If LangChain's AIMessage changes the structure, we might need to normalize AFTER creation:

```typescript
const message = new AIMessage({
  // ... existing code ...
  tool_calls: convertedToolCalls,
  invalid_tool_calls: [],
});

// NEW: Normalize tool calls after AIMessage creation
// LangChain might have transformed them
const normalizedToolCalls = message.tool_calls?.map(tc => ({
  id: tc.id,
  name: tc.name,
  args: typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args
})) || [];

// Replace tool_calls with normalized version
if (normalizedToolCalls.length > 0) {
  message.tool_calls = normalizedToolCalls;
}
```

---

## Conclusion

The logs show that Fusion returns the correct structure. The problem likely occurs when:
1. LangChain's AIMessage processes the tool calls, OR
2. n8n's AI Agent extracts tool calls from the AIMessage

We need to add diagnostic logging to identify where the structure changes, then apply normalization at the correct point in the pipeline.

