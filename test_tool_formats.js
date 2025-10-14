const fetch = require('node-fetch');

const API_KEY = 'sk-fusion-a24fc0c852513dd0964c5ea19ada4f98bac9bc630a80c100b3531398';
const BASE_URL = 'https://api.mcp4.ai/api/chat';

async function testFormat(testName, payload) {
  console.log('\n=========================================');
  console.log(`Test: ${testName}`);
  console.log('=========================================');
  console.log('Request payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nSending request...\n');

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:');
    console.log(JSON.stringify(data, null, 2));

    // Check if tools were used
    if (data.response?.tool_calls) {
      console.log('\n✅ Tool calls found in response!');
      console.log('Tool calls:', data.response.tool_calls);
    } else {
      console.log('\n❌ No tool calls in response');
    }

    return data;
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return null;
  }
}

async function runAllTests() {
  // Test 1: Current (Broken) Format - LangChain serialization
  await testFormat('Current (Broken) Format - LangChain Placeholder', {
    prompt: 'use the calculator tool to compute 5+4',
    provider: 'openai',
    model: 'gpt-4o-mini',
    tools: [
      {
        lc: 1,
        type: 'not_implemented',
        id: ['langchain', 'tools', 'DynamicStructuredTool'],
      },
    ],
    enable_tools: true,
  });

  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between requests

  // Test 2: OpenAI Function Calling Format (with type: function wrapper)
  await testFormat('OpenAI Function Calling Format (Standard)', {
    prompt: 'use the calculator tool to compute 5+4',
    provider: 'openai',
    model: 'gpt-4o-mini',
    tools: [
      {
        type: 'function',
        function: {
          name: 'calculator',
          description: 'Perform mathematical calculations',
          parameters: {
            type: 'object',
            properties: {
              expression: {
                type: 'string',
                description: 'The mathematical expression to evaluate',
              },
            },
            required: ['expression'],
          },
        },
      },
    ],
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Simplified Format (name + description + parameters at top level)
  await testFormat('Simplified Tool Format', {
    prompt: 'use the calculator tool to compute 5+4',
    provider: 'openai',
    model: 'gpt-4o-mini',
    tools: [
      {
        name: 'calculator',
        description: 'Perform mathematical calculations',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string' },
          },
        },
      },
    ],
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Without Tools (Baseline)
  await testFormat('Without Tools (Baseline)', {
    prompt: 'What is 5+4?',
    provider: 'openai',
    model: 'gpt-4o-mini',
  });

  console.log('\n=========================================');
  console.log('All tests completed!');
  console.log('=========================================\n');
}

runAllTests().catch(console.error);

