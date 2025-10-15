#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://api.mcp4.ai/api/chat"
API_KEY="sk-fusion-a24fc0c852513dd0964c5ea19ada4f98bac9bc630a80c100b3531398"

echo -e "${YELLOW}=== Testing NeuroSwitch Backend ===${NC}\n"

# Test 1: Simple chat without tools
echo -e "${YELLOW}Test 1: Simple chat (no tools)${NC}"
echo "Request: 'What is 5+5?'"
echo ""

RESPONSE1=$(curl -s -X POST "$API_URL" \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is 5+5?",
    "provider": "OpenAI",
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "max_tokens": 100
  }')

echo "Response:"
echo "$RESPONSE1" | jq '.'
echo ""
echo -e "${GREEN}✓ Test 1 complete${NC}\n"

# Test 2: Chat with tools (OpenAI format)
echo -e "${YELLOW}Test 2: Chat with tools (OpenAI format)${NC}"
echo "Request: 'What is the weather in London?' with weather tool"
echo ""

RESPONSE2=$(curl -s -X POST "$API_URL" \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the weather in London?",
    "provider": "OpenAI",
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "max_tokens": 500,
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get the current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city and country, e.g. London, UK"
              },
              "units": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "The temperature unit"
              }
            },
            "required": ["location"]
          }
        }
      }
    ],
    "enable_tools": true
  }')

echo "Response:"
echo "$RESPONSE2" | jq '.'
echo ""

# Check if tool_calls are in the response
if echo "$RESPONSE2" | jq -e '.assistant_response' | grep -q "tool_use\|get_weather"; then
  echo -e "${GREEN}✓ Tool call detected in response!${NC}"
else
  echo -e "${RED}✗ No tool call detected - check NeuroSwitch logs${NC}"
fi
echo ""
echo -e "${GREEN}✓ Test 2 complete${NC}\n"

# Test 3: Math tool test
echo -e "${YELLOW}Test 3: Math calculator tool${NC}"
echo "Request: 'Calculate 23 * 47' with calculator tool"
echo ""

RESPONSE3=$(curl -s -X POST "$API_URL" \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Calculate 23 * 47",
    "provider": "OpenAI",
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "max_tokens": 500,
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "calculator",
          "description": "Perform mathematical calculations",
          "parameters": {
            "type": "object",
            "properties": {
              "operation": {
                "type": "string",
                "description": "The mathematical operation to perform",
                "enum": ["add", "subtract", "multiply", "divide"]
              },
              "num1": {
                "type": "number",
                "description": "First number"
              },
              "num2": {
                "type": "number",
                "description": "Second number"
              }
            },
            "required": ["operation", "num1", "num2"]
          }
        }
      }
    ],
    "enable_tools": true
  }')

echo "Response:"
echo "$RESPONSE3" | jq '.'
echo ""

if echo "$RESPONSE3" | jq -e '.assistant_response' | grep -q "tool_use\|calculator"; then
  echo -e "${GREEN}✓ Calculator tool call detected!${NC}"
else
  echo -e "${RED}✗ No tool call detected${NC}"
fi
echo ""
echo -e "${GREEN}✓ Test 3 complete${NC}\n"

echo -e "${YELLOW}=== All tests complete ===${NC}"
echo -e "${YELLOW}Check NeuroSwitch logs at: /root/.pm2/logs/neuro-error.log${NC}"

