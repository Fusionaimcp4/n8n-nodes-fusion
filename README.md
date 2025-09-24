# n8n-nodes-fusion

An n8n community node that integrates **Fusion AI** (NeuroSwitch multi-provider orchestration) as a Language Model provider in n8n workflows.

![Fusion AI](https://img.shields.io/badge/Fusion%20AI-NeuroSwitch-blue) ![n8n](https://img.shields.io/badge/n8n-Community%20Node-orange) ![MIT License](https://img.shields.io/badge/License-MIT-green)

## 🚀 What is Fusion AI?

Fusion AI provides a unified API to access multiple AI providers (OpenAI, Anthropic Claude, Google Gemini) through NeuroSwitch orchestration. This node brings that power directly into your n8n workflows as a native Language Model provider.

## ✨ Features

- **🤖 Multi-Provider Access**: OpenAI, Claude, Gemini through single interface
- **🔗 AI Agent Compatible**: Works seamlessly with n8n's AI Agent workflows  
- **⚙️ Full Parameter Control**: Temperature, tokens, penalties, and more
- **🔄 Dynamic Model Loading**: Automatically fetches available models from API
- **🛡️ Secure Authentication**: API key-based authentication with masked inputs

## 📦 Installation

### Option 1: NPM Install (Recommended)

```bash
npm install n8n-nodes-fusion
```

### Option 2: Manual Installation

1. **Download or clone this repository**
2. **Install dependencies and build**:
   ```bash
   npm install
   npm run build
   ```

3. **Copy to n8n custom nodes directory**:
   ```bash
   # Linux/Mac
   cp -r dist/* ~/.n8n/custom/

   # Windows
   copy dist\* %USERPROFILE%\.n8n\custom\
   ```

4. **Set environment variable** (if needed):
   ```bash
   export N8N_CUSTOM_EXTENSIONS=~/.n8n/custom
   ```

5. **Restart n8n**

## 🔧 Setup

### 1. Get Your Fusion AI API Key

1. Sign up at [Fusion AI](https://fusion.mcp4.ai)
2. Navigate to API settings
3. Generate a new API key (format: `sk-fusion-xxx...`)

### 2. Configure Credentials in n8n

1. Go to **Settings** → **Credentials**
2. Click **+ Add Credential**
3. Search for **"Fusion API"**
4. Enter your details:
   - **API Key**: `sk-fusion-your-key-here`
   - **Base URL**: `https://api.mcp4.ai` (default)
5. Click **Test** to verify connection
6. **Save** the credential

## 🎯 Usage

### Two Node Types Available

**1. Fusion AI Node (Regular Chat) - ✅ RECOMMENDED**
- Direct API calls with full control
- Multiple operations: Chat, Models, Account
- Perfect for building custom workflows
- **Guaranteed to work in all n8n versions**

**2. Fusion Chat Model (AI Language Model Provider) - ⚠️ EXPERIMENTAL**
- Intended for "Language Models" panel
- May not connect to AI Agent due to n8n limitations
- Use Fusion AI node as alternative

### Adding Fusion AI Node to Workflows

1. **Open n8n workflow editor**
2. **Look for "Fusion AI" in the AI section**
3. **Drag "Fusion AI"** into your workflow
4. **Configure the node**:
   - Select your Fusion API credentials
   - Choose Resource (Chat/Models/Account)
   - Choose Operation and configure parameters

### Adding Fusion Chat Model for AI Agents

1. **Open n8n workflow editor**
2. **Look for "Language Models" in the left panel** 
3. **Drag "Fusion Chat Model"** into your workflow
4. **Configure the node**:
   - Select your Fusion API credentials
   - Choose a model (auto-loaded from API)
   - Adjust parameters (temperature, max tokens, etc.)
5. **Connect to AI Agent node**:
   - The connection should show as **"Language Model"** type
   - You should see the AI Agent accept the connection without errors

> **💡 Note**: If the node appears as "CUSTOM.fusionChatModel" instead of in the Language Models panel, restart n8n after installation.

### Available Models

The node automatically loads available models from Fusion AI:
- **NeuroSwitch** (default multi-provider)
- **OpenAI GPT-4** variants
- **Anthropic Claude** models  
- **Google Gemini** models

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| **Model** | Dropdown | `neuroswitch` | AI model to use |
| **Temperature** | Number | `0.3` | Randomness (0.0-1.0) |
| **Max Tokens** | Number | `1024` | Response length limit |
| **Top P** | Number | `1.0` | Nucleus sampling |
| **Frequency Penalty** | Number | `0.0` | Repetition penalty |
| **Presence Penalty** | Number | `0.0` | Topic diversity |

## 🔗 Workflow Examples

> **💡 Tip**: Complete workflow JSON files are available in the `/examples` directory. Import them directly into n8n for quick testing!

### Example 1: Direct AI Chat (Fusion AI Node)

```json
{
  "nodes": [
    {
      "parameters": {
        "resource": "chat",
        "operation": "sendMessage",
        "model": "neuroswitch",
        "message": "Explain quantum computing in simple terms",
        "additionalFields": {
          "temperature": 0.7
        }
      },
      "type": "n8n-nodes-fusion.fusion",
      "position": [240, 300],
      "name": "Fusion AI"
    }
  ]
}
```

### Example 2: AI Agent Integration (Fusion Chat Model)

```json
{
  "nodes": [
    {
      "parameters": {
        "model": "neuroswitch",
        "temperature": 0.7
      },
      "type": "n8n-nodes-fusion.fusionChatModel",
      "position": [240, 300],
      "name": "Fusion Chat Model"
    },
    {
      "parameters": {
        "message": "Explain quantum computing in simple terms"
      },
      "type": "@n8n/n8n-nodes-langchain.aiAgent",
      "position": [460, 300],
      "name": "AI Agent"
    }
  ],
  "connections": {
    "Fusion Chat Model": {
      "ai_languageModel": [
        ["AI Agent", "ai_languageModel"]
      ]
    }
  }
}
```

### Example 3: Document Analysis with AI Agent

```json
{
  "nodes": [
    {
      "parameters": {
        "model": "anthropic/claude-3-sonnet",
        "temperature": 0.2,
        "maxTokens": 2048
      },
      "type": "n8n-nodes-fusion.fusionChatModel", 
      "name": "Fusion Chat Model"
    },
    {
      "parameters": {
        "message": "Analyze this document and provide key insights: {{ $json.document }}"
      },
      "type": "@n8n/n8n-nodes-langchain.aiAgent",
      "name": "Document Analyzer"
    }
  ]
}
```

### Example 4: Model Comparison Workflow

Test multiple AI providers with the same prompt to compare responses:

**Features**:
- Lists all available models
- Checks account status and credits
- Tests OpenAI GPT-4, Claude 3 Sonnet, and Gemini Pro
- Compares responses, costs, and token usage

**Import**: Use `/examples/model-comparison-workflow.json`

### 📁 Available Example Files

| File | Description | Use Case |
|------|-------------|----------|
| `direct-chat-workflow.json` | Simple chat with Fusion AI node | Direct API interaction |
| `ai-agent-workflow.json` | Document analysis with AI Agent | Language Model integration |
| `model-comparison-workflow.json` | Multi-provider comparison | Testing different models |

**To Import**:
1. Download the JSON file from `/examples` directory
2. In n8n, go to **Workflows** → **Import from File**
3. Select the JSON file and import
4. Configure your Fusion API credentials
5. Execute the workflow!

## 🛠️ Development

### Local Development

```bash
# Clone repository
git clone https://github.com/Fusionaimcp4/n8n-nodes-fusion.git
cd n8n-nodes-fusion

# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Project Structure

```
n8n-nodes-fusion/
├── credentials/
│   └── FusionApi.credentials.ts    # API credentials definition
├── nodes/
│   └── Fusion/
│       ├── FusionChatModel.node.ts # Main language model node
│       ├── FusionChatModel.node.json # Node metadata
│       └── fusion.svg              # Node icon
├── dist/                           # Compiled output
├── package.json                    # Project configuration
├── tsconfig.json                   # TypeScript configuration
└── index.js                        # Node exports
```

### Testing

The credential test endpoint verifies connectivity:
```bash
GET https://api.mcp4.ai/api/models
Authorization: ApiKey sk-fusion-xxx...
```

Chat completions use:
```bash
POST https://api.mcp4.ai/api/chat
Authorization: ApiKey sk-fusion-xxx...
Content-Type: application/json

{
  "prompt": "Your message here",
  "provider": "neuroswitch",
  "model": "neuroswitch",
  "temperature": 0.3,
  "max_tokens": 1024
}
```

## 🚨 Troubleshooting

### Node Not Appearing

1. **Check installation**: Ensure files are in correct directory
2. **Restart n8n**: Restart after installing custom nodes
3. **Check environment**: Verify `N8N_CUSTOM_EXTENSIONS` if using custom path
4. **Check logs**: Look for errors in n8n startup logs

### Fusion Chat Model Not in Language Models Panel

1. **Restart n8n**: Custom AI Language Model nodes require restart
2. **Check node order**: Ensure `FusionChatModel.node.js` is listed first in package.json
3. **Verify outputs**: Check that metadata shows `"outputs": ["ai_languageModel"]`
4. **Check file structure**: Ensure all files in `dist/nodes/Fusion/` are present

### Cannot Connect to AI Agent

**Current Limitation**: n8n's AI Agent may not recognize custom AI Language Model nodes due to internal implementation restrictions.

**Workaround Options**:

1. **Use Fusion AI Node (Direct)**: 
   - Use the regular "Fusion AI" node instead
   - Set Resource: "Chat", Operation: "Send Message"
   - This provides direct API access with full control

2. **Custom Workflow**:
   - Use HTTP Request node to call Fusion API directly
   - Format: `POST https://api.mcp4.ai/api/chat`
   - Headers: `Authorization: ApiKey your-key`
   - Body: `{"prompt": "your message", "provider": "neuroswitch"}`

3. **Wait for n8n Update**: 
   - Future n8n versions may support custom AI Language Model nodes
   - Monitor n8n community updates

**If Connection Works**:
1. **Node type**: Ensure using "Fusion Chat Model" (not "Fusion AI")
2. **Connection type**: Look for "Language Model" connection port on AI Agent  
3. **Node restart**: Try deleting and re-adding the Fusion Chat Model node
4. **Version check**: Ensure n8n version supports AI Language Model connections

### Authentication Errors

1. **Verify API key**: Ensure key starts with `sk-fusion-`
2. **Check permissions**: Ensure key has appropriate access
3. **Test endpoint**: Use credential test feature in n8n
4. **Check base URL**: Ensure using `https://api.mcp4.ai`

### Model Loading Issues

If models don't load, the node falls back to:
- NeuroSwitch
- OpenAI GPT-4  
- Anthropic Claude
- Google Gemini

## 📖 API Documentation

For complete API documentation, visit: [Fusion AI API Docs](https://api.mcp4.ai/api-docs/)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.txt) file for details.

## 🙏 Acknowledgments

- [n8n](https://n8n.io/) for the amazing workflow automation platform
- [Fusion AI](https://fusion.mcp4.ai) for the powerful multi-provider AI orchestration
- The n8n community for inspiration and support

---

**Made with ❤️ for the n8n community**