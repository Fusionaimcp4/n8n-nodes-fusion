# n8n-nodes-fusion

A community node for n8n that integrates **Fusion AI** - a unified AI orchestration platform with **NeuroSwitch™** intelligent routing across multiple providers (OpenAI, Anthropic/Claude, Google/Gemini).

## Project Overview

### What is Fusion AI?

Fusion AI is a unified AI assistant platform that provides seamless access to multiple AI providers through a single API. The platform features **NeuroSwitch™**, an intelligent routing system that automatically selects the optimal AI model for each query based on content analysis, performance metrics, and cost optimization.

**Key Features:**
- 🧠 **NeuroSwitch™**: Intelligent model selection and routing
- 🔗 **Multi-Provider**: OpenAI, Anthropic (Claude), Google (Gemini)
- 💰 **Cost Optimization**: Transparent pricing with credit-based billing
- 📊 **Analytics**: Comprehensive usage tracking and performance metrics
- 🚀 **High Performance**: Optimized response times and reliability

### Purpose of this Package

This n8n community node enables you to use Fusion AI's capabilities directly within your n8n workflows, allowing you to:

- Send messages to AI providers via unified API
- Monitor credit balance and transaction history
- Analyze usage patterns and performance metrics
- Leverage intelligent model routing without manual provider selection

## Installation

### Local Installation

1. **Install the package:**
   ```bash
   npm install n8n-nodes-fusion
   ```

2. **Copy to n8n custom nodes directory:**
   ```bash
   # Create custom nodes directory if it doesn't exist
   mkdir -p ~/.n8n/custom

   # Copy the built package
   cp -r node_modules/n8n-nodes-fusion ~/.n8n/custom/
   ```

3. **Restart n8n** to load the new node.

### Building from Source

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yilakkidane/n8n-nodes-fusion.git
   cd n8n-nodes-fusion
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Copy to n8n:**
   ```bash
   cp -r dist ~/.n8n/custom/n8n-nodes-fusion/
   ```

### Publishing and Versioning

This package follows semantic versioning (semver). To publish updates:

```bash
# Build and test
npm run build
npm run lint
npm test

# Publish to npm
npm publish
```

## Authentication

### Getting Your Fusion AI API Key

1. Visit [Fusion AI Platform](https://fusion.mcp4.ai)
2. Create an account or sign in
3. Navigate to **API Keys** in your dashboard
4. Generate a new API key
5. Copy the key for use in n8n

### Configure in n8n

1. **Add Credential:**
   - In n8n, go to **Settings** → **Credentials**
   - Click **Create Credential**
   - Search for and select **Fusion API**

2. **Enter Details:**
   - **API Key**: Your Fusion AI API key (required, masked input)
   - **Base URL**: `https://fusion.mcp4.ai` (default, leave unchanged unless self-hosting)

3. **Test Connection:**
   - Click **Test** to verify your credentials
   - Save the credential for use in workflows

### Self-Hosted Fusion (Advanced)

If you're running Fusion AI on your own infrastructure:

```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://your-fusion-instance.com"
}
```

## Node Usage

The Fusion AI node provides three main resources with specific operations:

### 1. Chat Resource

**Operation:** `Send Message`  
**Endpoint:** `POST /api/chat`

Send messages to AI providers through Fusion's intelligent routing system.

**Parameters:**
- **Prompt** (required): Your message or query
- **Provider**: `neuroswitch` (auto-select), `openai`, `claude`, `gemini`
- **Model**: Specific model (e.g., `gpt-4o`, `claude-3-sonnet`) - optional
- **Mode**: `chat`, `completion`, `generation`
- **Image**: Base64-encoded image for vision models - optional

**Example Output:**
```json
{
  "prompt": "Explain quantum computing in simple terms",
  "response": {
    "text": "Quantum computing is a type of computation that harnesses quantum mechanical phenomena..."
  },
  "provider": "openai",
  "model": "gpt-4o",
  "tokens": {
    "total_tokens": 150,
    "input_tokens": 50,
    "output_tokens": 100
  },
  "cost_charged_to_credits": 0.0003,
  "neuroswitch_fee_charged_to_credits": 0.001,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Credits Resource

**Operation:** `Get Balance`  
**Endpoint:** `GET /api/user/credits`

Retrieve your current credit balance and transaction history.

**Parameters:** None (uses authenticated user)

**Example Output:**
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
    }
  ]
}
```

### 3. Usage Resource

**Operation:** `Get Logs`  
**Endpoint:** `GET /api/user/activity`

Fetch detailed usage logs and analytics.

**Parameters (Optional):**
- **Limit**: Items per page (1-100, default: 50)
- **Page**: Page number (default: 1)
- **Start Date**: Filter from date (ISO 8601)
- **End Date**: Filter to date (ISO 8601)
- **Provider**: Filter by provider (`openai`, `claude`, `gemini`)

**Example Output:**
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
  "limit": 50,
  "summary": {
    "total_tokens": 187500,
    "total_cost": 3.75,
    "average_response_time": 1.8,
    "most_used_provider": "openai"
  }
}
```

## Examples

### Minimal Chat Workflow

```yaml
# Simple AI chat workflow
1. Trigger: Manual Trigger
2. Fusion AI Node:
   - Resource: Chat
   - Operation: Send Message
   - Prompt: "Hello, how are you?"
   - Provider: neuroswitch (auto-select)
3. Response processing...
```

**Expected Response:**
```json
{
  "response": {
    "text": "Hello! I'm doing well, thank you for asking. How can I help you today?"
  },
  "provider": "openai",
  "model": "gpt-4o-mini",
  "tokens": { "total_tokens": 25, "input_tokens": 8, "output_tokens": 17 }
}
```

### Credits Check Workflow

```yaml
# Monitor credit balance
1. Schedule Trigger: Daily at 9 AM
2. Fusion AI Node:
   - Resource: Credits
   - Operation: Get Balance
3. If Node: Check if balance < $10
4. Email Node: Send low balance alert
```

### Usage Analytics Workflow

```yaml
# Weekly usage report
1. Schedule Trigger: Weekly on Monday
2. Fusion AI Node:
   - Resource: Usage
   - Operation: Get Logs
   - Start Date: 7 days ago
   - Limit: 100
3. Aggregate data and send report
```

## Development

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development mode:**
   ```bash
   npm run dev
   ```
   This starts TypeScript compilation in watch mode.

3. **Compiled files location:**
   - Output directory: `dist/`
   - Node: `dist/nodes/Fusion/Fusion.node.js`
   - Credentials: `dist/credentials/FusionApi.credentials.js`

### Code Quality

**Linting:**
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lintfix
```

**Testing:**
```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

**Formatting:**
```bash
# Format code
npm run format
```

### Project Structure

```
n8n-nodes-fusion/
├── nodes/
│   └── Fusion/
│       ├── Fusion.node.ts      # Main node implementation
│       ├── Fusion.node.json    # Node metadata
│       ├── FusionApi.credentials.ts # Credentials definition
│       └── fusion.svg          # Node icon
├── credentials/
│   └── FusionApi.credentials.ts # Credentials (copy)
├── dist/                       # Compiled output
├── package.json               # Package configuration
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Troubleshooting

### Common Issues

**Node not appearing in n8n:**
- Ensure the package is properly copied to `~/.n8n/custom/`
- Restart n8n completely
- Check n8n logs for any loading errors

**Authentication failures:**
- Verify your API key is correct and active
- Check if base URL is properly configured
- Test credentials using the built-in test function

**Build errors:**
- Ensure all dependencies are installed: `npm install`
- Check TypeScript version compatibility
- Run `npm run lint` to identify code issues

## API Documentation

For complete API documentation, see [FUSION_API.md](./FUSION_API.md) in this repository.

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/yilakkidane/n8n-nodes-fusion/issues)
- **Documentation**: [Fusion AI Docs](https://fusion.mcp4.ai/docs)
- **Community**: [n8n Community Forum](https://community.n8n.io)

---

**Made with ❤️ for the n8n community**
