# Fusion AI Node for n8n

[![npm version](https://img.shields.io/npm/v/n8n-nodes-fusion)](https://www.npmjs.com/package/n8n-nodes-fusion)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-fusion)](https://www.npmjs.com/package/n8n-nodes-fusion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![n8n Community Node](https://img.shields.io/badge/n8n-Community%20Node-blue)](https://n8n.io/)

A production-ready n8n community node package that provides seamless integration with Fusion AI's NeuroSwitch multi-provider orchestration platform.

## 🚀 Features

- **Multi-Provider AI Access**: Connect to OpenAI, Anthropic, Google, and other AI providers through a single unified interface
- **NeuroSwitch Auto-Routing**: Intelligent automatic provider selection based on availability and performance
- **LangChain Integration**: Full compatibility with n8n's AI Agent workflows and tool calling
- **Secure Credentials**: API keys are stored securely with `noData: true` protection
- **Production Ready**: Built with TypeScript, strict type checking, and comprehensive error handling

## 📦 Installation

### From npm (Recommended)
```bash
npm install fusion-node
```

### From Source
```bash
git clone https://github.com/Fusionaimcp4/n8n-nodes-fusion.git
cd n8n-nodes-fusion
npm install
npm run build
```

### In n8n
1. Install the package in your n8n instance
2. Restart n8n
3. The Fusion AI nodes will appear in the node palette

## 🔧 Setup

### 1. Get Your Fusion API Key
1. Visit [Fusion AI Platform](https://api.mcp4.ai)
2. Sign up for an account
3. Generate your API key from the dashboard

### 2. Configure Credentials in n8n
1. In n8n, go to **Credentials** → **Add Credential**
2. Search for **Fusion API**
3. Enter your API key
4. Optionally customize the base URL (default: `https://api.mcp4.ai`)
5. Test the connection

## 🎯 Usage

### Fusion Chat Model Node (AI Agent Integration)

The primary node for AI Agent workflows:

1. **Add Node**: Drag "Fusion Chat Model" from the node palette
2. **Select Model**: Choose from available providers:
   - NeuroSwitch (auto routing) - Recommended
   - OpenAI: GPT-4, GPT-3.5-turbo
   - Anthropic: Claude 3 Sonnet, Claude 3 Haiku
   - Google: Gemini Pro, Gemini Pro Vision
3. **Configure Options**:
   - Temperature: 0.0-1.0 (default: 0.3)
   - Max Tokens: 1-4096 (default: 1024)
4. **Connect to AI Agent**: Use as a Language Model in AI Agent workflows

### Example AI Agent Workflow

```json
{
  "nodes": [
    {
      "name": "Fusion Chat Model",
      "type": "fusionChatModel",
      "parameters": {
        "model": "neuroswitch",
        "options": {
          "temperature": 0.3,
          "maxTokens": 1024
        }
      }
    },
    {
      "name": "AI Agent",
      "type": "aiAgent",
      "parameters": {
        "languageModel": "={{ $('Fusion Chat Model').item.json.response }}"
      }
    }
  ]
}
```

## 🔒 Security

### Credential Protection
- **API Keys**: Stored securely with `noData: true` protection
- **No Data Persistence**: Credentials are not logged or stored in plain text
- **Secure Transmission**: All API calls use HTTPS encryption

### Best Practices
1. **Environment Variables**: Use environment variables for API keys in production
2. **Access Control**: Limit API key permissions to necessary scopes
3. **Monitoring**: Monitor API usage and costs through Fusion AI dashboard
4. **Rotation**: Regularly rotate API keys for enhanced security

### Reporting Security Issues
If you discover a security vulnerability, please **do not** open a public GitHub issue. Instead:
- **Email**: `security@mcp4.ai`
- **Response Time**: We aim to respond within 24-48 hours
- **See**: [SECURITY.md](SECURITY.md) for detailed reporting guidelines

## 🛠️ Development

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- TypeScript knowledge

### Building from Source
```bash
# Clone repository
git clone https://github.com/Fusionaimcp4/n8n-nodes-fusion.git
cd n8n-nodes-fusion

# Install dependencies
npm install

# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

### Project Structure
```
├── dist/                    # Built files (production)
├── nodes/Fusion/           # Source TypeScript files
│   ├── FusionChatModel.node.ts    # Main AI Agent node
│   ├── FusionApi.credentials.ts   # Credential configuration
│   └── fusion.svg                # Node icon
├── package.json           # Package configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## 📊 Supported Models

### OpenAI
- GPT-4
- GPT-4 Turbo
- GPT-3.5-turbo
- GPT-3.5-turbo-16k

### Anthropic
- Claude 3 Sonnet
- Claude 3 Haiku
- Claude 3 Opus

### Google
- Gemini Pro
- Gemini Pro Vision

### Auto-Routing (NeuroSwitch)
- Automatically selects the best available provider
- Handles failover and load balancing
- Optimizes for cost and performance

## 🐛 Troubleshooting

### Common Issues

**"Invalid model ID" Error**
- Ensure the model string format is correct: `provider:model_id`
- Check that the model is active in your Fusion AI account

**"Could not resolve parameter dependencies" Error**
- This has been fixed in the latest version
- Update to the latest package version

**Connection Timeout**
- Verify your API key is correct
- Check your internet connection
- Ensure the base URL is accessible

### Debug Mode
Enable debug logging in n8n to see detailed error messages:
```bash
N8N_LOG_LEVEL=debug npm start
```

## 📈 Performance

### Optimization Tips
1. **Use NeuroSwitch**: Automatic routing optimizes for speed and cost
2. **Batch Requests**: Process multiple items in a single workflow execution
3. **Cache Results**: Store frequently used responses
4. **Monitor Usage**: Track token consumption and costs

### Rate Limits
- Fusion AI handles rate limiting automatically
- NeuroSwitch provides intelligent queuing
- Respect individual provider rate limits

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## 🆘 Support

- **Documentation**: [Fusion AI API Docs](https://api.mcp4.ai/api-docs/)
- **Issues**: [GitHub Issues](https://github.com/Fusionaimcp4/n8n-nodes-fusion/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Fusionaimcp4/n8n-nodes-fusion/discussions)
- **Email**: support@mcp4.ai

## 🔄 Changelog

### v0.1.0
- Initial release
- Fusion Chat Model node for AI Agent integration
- Multi-provider support (OpenAI, Anthropic, Google)
- NeuroSwitch auto-routing
- Secure credential handling
- Production-ready build system

---

**Made with ❤️ by the Fusion AI team**