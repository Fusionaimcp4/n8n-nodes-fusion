#!/bin/bash

API_KEY="sk-fusion-a24fc0c852513dd0964c5ea19ada4f98bac9bc630a80c100b3531398"
BASE_URL="https://api.mcp4.ai/api/chat"

echo "========================================="
echo "Test 1: Current (Broken) Format"
echo "========================================="
echo "Sending LangChain serialization placeholder..."
curl -X POST "$BASE_URL" \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "use the calculator tool to compute 5+4",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "tools": [
      {
        "lc": 1,
        "type": "not_implemented",
        "id": ["langchain", "tools", "DynamicStructuredTool"]
      }
    ],
    "enable_tools": true
  }' | jq .

echo ""
echo ""
echo "========================================="
echo "Test 2: OpenAI Function Calling Format"
echo "========================================="
echo "Sending proper OpenAI-formatted tools..."
curl -X POST "$BASE_URL" \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "use the calculator tool to compute 5+4",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "calculator",
          "description": "Perform mathematical calculations",
          "parameters": {
            "type": "object",
            "properties": {
              "expression": {
                "type": "string",
                "description": "The mathematical expression to evaluate"
              }
            },
            "required": ["expression"]
          }
        }
      }
    ]
  }' | jq .

echo ""
echo ""
echo "========================================="
echo "Test 3: Without Tools (Baseline)"
echo "========================================="
echo "Sending request without any tools..."
curl -X POST "$BASE_URL" \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is 5+4?",
    "provider": "openai",
    "model": "gpt-4o-mini"
  }' | jq .

echo ""
echo ""
echo "========================================="
echo "Test 4: Simplified Tool Format"
echo "========================================="
echo "Sending minimal tool format..."
curl -X POST "$BASE_URL" \
  -H "Authorization: ApiKey $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "use the calculator tool to compute 5+4",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "tools": [
      {
        "name": "calculator",
        "description": "Perform mathematical calculations",
        "parameters": {
          "type": "object",
          "properties": {
            "expression": {"type": "string"}
          }
        }
      }
    ]
  }' | jq .

