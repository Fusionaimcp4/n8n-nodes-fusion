# Fusion AI API Reference

## Overview

Fusion AI is a unified AI assistant platform that provides access to multiple AI providers (OpenAI, Anthropic/Claude, Google/Gemini) through a single API. The platform features **NeuroSwitch™**, an intelligent routing system that automatically selects the optimal AI model for each query based on content analysis and performance metrics.

This API reference is designed to guide developers building and maintaining the `n8n-nodes-fusion` package, which integrates Fusion AI’s capabilities into n8n workflows.

---

## Authentication

### API Key Authentication

All API requests require authentication via Bearer token in the `Authorization` header:

```
Authorization: Bearer <apiKey>
```

### Base URL

* **Default (prod)**: `https://fusion.mcp4.ai`
* **Development**: `http://localhost:5000` (if running locally)

### Role-Based Access

* **user**: Standard access with credit-based billing
* **tester**: Free monthly allowances for testing
* **pro**: Premium features and higher limits
* **admin**: Full system access and management capabilities

---

## Endpoints

### POST `/api/chat`

Send a chat message to AI providers through Fusion’s unified interface.

#### Description

Processes chat requests via **NeuroSwitch™** intelligent routing or direct provider selection. Supports text, images, and file generation with comprehensive cost tracking.

#### Request Format

```json
{
  "prompt": "Explain quantum computing in simple terms",
  "provider": "neuroswitch",
  "model": "gpt-4o",
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "mode": "chat"
}
```

**Fields**

* `prompt` (required): The user’s message or query
* `provider` (optional): `"neuroswitch" | "openai" | "claude" | "gemini"`
* `model` (optional): Specific model ID (e.g., `"gpt-4o"`, `"claude-3-sonnet"`)
* `image` (optional): Base64-encoded image for vision models
* `mode` (optional): `"chat" | "completion" | "generation"`

#### Response Format

```json
{
  "prompt": "Explain quantum computing in simple terms",
  "response": { "text": "Quantum computing is a type of computation that harnesses quantum mechanical phenomena..." },
  "provider": "openai",
  "model": "gpt-4o",
  "tokens": {
    "total_tokens": 150,
    "input_tokens": 50,
    "output_tokens": 100
  },
  "cost_charged_to_credits": 0.0003,
  "neuroswitch_fee_charged_to_credits": 0.001,
  "original_llm_cost": 0.0003,
  "original_neuroswitch_fee": 0.001,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "tool_name": null,
  "file_downloads": [],
  "image_url": null,
  "file_url": null,
  "file_name": null,
  "mime_type": null
}
```

#### Error Format

```json
{
  "error": "Insufficient credits",
  "message": "You do not have enough credits to complete this action. Please top up to continue."
}
```

**Common Error Codes**

* `400` Bad request (missing prompt, invalid parameters)
* `401` Unauthorized (invalid or missing token)
* `402` Payment required (insufficient credits)
* `429` Rate limit exceeded
* `500` Internal server error
* `503` Service unavailable (all providers failed)

---

### GET `/api/user/credits`

Retrieve user’s credit balance and transaction history.

#### Description

Returns current credit balance and recent transaction history for billing and usage tracking.

#### Request Format

No request body. Uses authentication token for user identification.

#### Response Format

```json
{
  "balance_cents": 5000,
  "balance_dollars": 50.00,
  "transactions": [
    {
      "id": 123,
      "amount_cents": -300,
      "method": "usage",
      "status": "completed",
      "description": "Usage for openai/gpt-4o, 150 tokens",
      "created_at": "2024-01-01T12:00:00.000Z"
    },
    {
      "id": 122,
      "amount_cents": 10000,
      "method": "stripe",
      "status": "completed",
      "description": "Credit top-up via Stripe",
      "created_at": "2024-01-01T10:00:00.000Z"
    }
  ]
}
```

#### Error Format

```json
{
  "error": "User not found",
  "message": "Unable to retrieve credit information for the specified user."
}
```

---

### GET `/api/user/activity`

Retrieve user’s usage logs and performance metrics.

#### Description

Returns detailed usage logs with token counts, costs, response times, and performance metrics for analysis and monitoring.

#### Request Format (Query Params)

* `page` (optional): Page number (default: 1)
* `limit` (optional): Items per page (default: 50, max: 100)
* `start_date` (optional): ISO 8601
* `end_date` (optional): ISO 8601
* `provider` (optional): Filter by provider name

#### Response Format

```json
{
  "usage_logs": [
    {
      "id": 456,
      "provider": "openai",
      "model": "gpt-4o",
      "prompt_tokens": 50,
      "completion_tokens": 100,
      "total_tokens": 150,
      "cost": 0.0003,
      "neuroswitch_fee": 0.001,
      "response_time": 1.2,
      "fallback_reason": null,
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 1250,
  "page": 1,
  "limit": 50,
  "pages": 25,
  "summary": {
    "total_tokens": 187500,
    "total_cost": 3.75,
    "average_response_time": 1.8,
    "most_used_provider": "openai",
    "most_used_model": "gpt-4o"
  }
}
```

#### Error Format

```json
{
  "error": "Invalid date range",
  "message": "Start date must be before end date."
}
```

---

## Data Structures

### Request Objects

#### Chat Request

```json
{
  "prompt": "string (required)",
  "provider": "string (optional)",
  "model": "string (optional)",
  "image": "string (optional, base64)",
  "mode": "string (optional)"
}
```

#### Activity Request (Query)

```json
{
  "page": "number (optional, default: 1)",
  "limit": "number (optional, default: 50)",
  "start_date": "string (optional, ISO 8601)",
  "end_date": "string (optional, ISO 8601)",
  "provider": "string (optional)"
}
```

### Response Objects

#### Chat Response

```json
{
  "prompt": "string",
  "response": { "text": "string" },
  "provider": "string",
  "model": "string",
  "tokens": {
    "total_tokens": "number",
    "input_tokens": "number",
    "output_tokens": "number"
  },
  "cost_charged_to_credits": "number",
  "neuroswitch_fee_charged_to_credits": "number",
  "original_llm_cost": "number",
  "original_neuroswitch_fee": "number",
  "timestamp": "string (ISO 8601)",
  "tool_name": "string|null",
  "file_downloads": "array",
  "image_url": "string|null",
  "file_url": "string|null",
  "file_name": "string|null",
  "mime_type": "string|null"
}
```

#### Credits Response

```json
{
  "balance_cents": "number",
  "balance_dollars": "number",
  "transactions": [
    {
      "id": "number",
      "amount_cents": "number",
      "method": "string",
      "status": "string",
      "description": "string",
      "created_at": "string (ISO 8601)"
    }
  ]
}
```

#### Activity Response

```json
{
  "usage_logs": [
    {
      "id": "number",
      "provider": "string",
      "model": "string",
      "prompt_tokens": "number",
      "completion_tokens": "number",
      "total_tokens": "number",
      "cost": "number",
      "neuroswitch_fee": "number",
      "response_time": "number",
      "fallback_reason": "string|null",
      "created_at": "string (ISO 8601)"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number",
  "pages": "number",
  "summary": {
    "total_tokens": "number",
    "total_cost": "number",
    "average_response_time": "number",
    "most_used_provider": "string",
    "most_used_model": "string"
  }
}
```

---

## Best Practices & Notes

### Rate Limiting & Timeouts

* **Rate Limits**: 100 requests per minute per user
* **Request Timeout**: 30 seconds for chat requests
* **Connection Timeout**: 10 seconds for initial connect
* **Retry Logic**: Use exponential backoff for `429`/`503` responses

### Error Handling

* Check HTTP status before parsing body
* Handle `402 Payment Required` gracefully (insufficient credits)
* Retry on transient errors (`5xx`, `429`)
* Log errors with request context (no secrets)

### Large Responses

* **Image Generation**: Uses CDN URLs, not base64
* **File Generation**: Large files uploaded to CDN; API returns URLs
* **Token Limits**: Models range \~4K–200K context; plan truncation/streaming
* **n8n Payload Size**: Monitor response size to avoid node memory limits

### Security

* Never log API keys or raw Authorization headers
* Always use HTTPS in production
* Validate credentials on save (where applicable)
* Consider request signing for high-security deployments

---

## Examples

### Minimal Chat Request

```bash
curl -X POST https://fusion.mcp4.ai/api/chat \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how are you?"
  }'
```

**Response**

```json
{
  "prompt": "Hello, how are you?",
  "response": { "text": "Hello! I'm doing well, thank you for asking. How can I help you today?" },
  "provider": "openai",
  "model": "gpt-4o-mini",
  "tokens": { "total_tokens": 25, "input_tokens": 8, "output_tokens": 17 },
  "cost_charged_to_credits": 0.00005,
  "neuroswitch_fee_charged_to_credits": 0.001,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Checking Credits

```bash
curl -X GET https://fusion.mcp4.ai/api/user/credits \
  -H "Authorization: Bearer your-api-key"
```

**Response**

```json
{
  "balance_cents": 5000,
  "balance_dollars": 50.00,
  "transactions": []
}
```

### Fetching Usage Logs

```bash
curl -X GET "https://fusion.mcp4.ai/api/user/activity?limit=10&provider=openai" \
  -H "Authorization: Bearer your-api-key"
```

**Response**

```json
{
  "usage_logs": [
    {
      "id": 456,
      "provider": "openai",
      "model": "gpt-4o",
      "prompt_tokens": 50,
      "completion_tokens": 100,
      "total_tokens": 150,
      "cost": 0.0003,
      "neuroswitch_fee": 0.001,
      "response_time": 1.2,
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "total": 1250,
  "page": 1,
  "limit": 10,
  "pages": 125
}
```
