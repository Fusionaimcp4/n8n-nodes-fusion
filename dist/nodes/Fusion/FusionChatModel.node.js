"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionChatModel = void 0;
class FusionChatModel {
    constructor() {
        this.description = {
            displayName: 'Fusion Chat Model',
            name: 'fusionChatModel',
            icon: 'file:fusion.svg',
            group: ['ai'],
            version: 1,
            subtitle: 'Language Model',
            description: 'Chat Model for Fusion AI',
            defaults: {
                name: 'Fusion Chat Model',
            },
            inputs: [],
            outputs: ["ai_languageModel" /* NodeConnectionType.AiLanguageModel */],
            credentials: [
                {
                    name: 'fusionApi',
                    required: true,
                },
            ],
            codex: {
                categories: ['AI', 'Language Models'],
                resources: {
                    primaryDocumentation: [
                        {
                            url: 'https://api.mcp4.ai/api-docs/',
                        },
                    ],
                },
            },
            properties: [
                {
                    displayName: 'Model',
                    name: 'model',
                    type: 'options',
                    typeOptions: {
                        loadOptionsMethod: 'getModels',
                    },
                    default: 'neuroswitch',
                    description: 'Model to use for the chat completion',
                },
                {
                    displayName: 'Options',
                    name: 'options',
                    placeholder: 'Add Option',
                    description: 'Additional options to configure',
                    type: 'collection',
                    default: {},
                    options: [
                        {
                            displayName: 'Temperature',
                            name: 'temperature',
                            default: 0.3,
                            typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
                            description: 'Controls randomness in the response. Lower values make responses more focused and deterministic.',
                            type: 'number',
                        },
                        {
                            displayName: 'Max Tokens',
                            name: 'maxTokens',
                            default: 1024,
                            typeOptions: { maxValue: 4096, minValue: 1 },
                            description: 'The maximum number of tokens to generate in the chat completion',
                            type: 'number',
                        },
                        {
                            displayName: 'Top P',
                            name: 'topP',
                            default: 1,
                            typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
                            description: 'An alternative to sampling with temperature, called nucleus sampling',
                            type: 'number',
                        },
                        {
                            displayName: 'Frequency Penalty',
                            name: 'frequencyPenalty',
                            default: 0,
                            typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
                            description: 'Positive values penalize new tokens based on their existing frequency in the text',
                            type: 'number',
                        },
                        {
                            displayName: 'Presence Penalty',
                            name: 'presencePenalty',
                            default: 0,
                            typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
                            description: 'Positive values penalize new tokens based on whether they appear in the text so far',
                            type: 'number',
                        },
                    ],
                },
            ],
        };
        this.methods = {
            loadOptions: {
                async getModels() {
                    try {
                        const credentials = await this.getCredentials('fusionApi');
                        const baseUrl = credentials.baseUrl?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
                        const response = await this.helpers.httpRequest({
                            method: 'GET',
                            url: `${baseUrl}/api/models`,
                            headers: {
                                Authorization: `ApiKey ${credentials.apiKey}`,
                                'Content-Type': 'application/json',
                            },
                        });
                        const models = (response.data || response || []);
                        return models.map((model) => ({
                            name: `${model.name || model.id_string} ($${model.input_cost_per_million_tokens || 'N/A'}/1M)`,
                            value: model.id_string || model.id,
                        }));
                    }
                    catch (error) {
                        console.warn('Failed to load Fusion models:', error.message);
                        return [
                            { name: 'NeuroSwitch', value: 'neuroswitch' },
                            { name: 'OpenAI GPT-4', value: 'openai/gpt-4' },
                            { name: 'Anthropic Claude', value: 'anthropic/claude-3-sonnet' },
                            { name: 'Google Gemini', value: 'google/gemini-pro' },
                        ];
                    }
                },
            },
        };
    }
    async supplyData(itemIndex) {
        const credentials = await this.getCredentials('fusionApi');
        const baseUrl = credentials.baseUrl?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
        const model = this.getNodeParameter('model', itemIndex);
        const options = this.getNodeParameter('options', itemIndex);
        // Enhanced language model with tools calling support for n8n AI Agent
        const languageModel = {
            // Required properties for n8n Tools Agent compatibility
            _llmType: 'chat',
            modelName: model || 'fusion-neuroswitch',
            // Tools calling support with logging
            get supportsToolCalling() {
                console.log('🔍 n8n checking supportsToolCalling - returning true');
                return true;
            },
            // Additional LangChain compatibility properties
            _modelType: 'chat',
            name: model || 'fusion-neuroswitch',
            lc_namespace: ['langchain', 'chat_models'],
            // Alternative property names that n8n might check
            supportsToolChoice: true,
            supportsStructuredOutput: true,
            // Method-based check for tools calling
            get _supportsToolCalling() {
                console.log('🔍 n8n checking _supportsToolCalling - returning true');
                return true;
            },
            // LangChain Runnable interface implementation
            lc_runnable: true,
            // Required Runnable methods
            async batch(inputs, options) {
                console.log('📦 batch method called with inputs type:', typeof inputs, 'length:', Array.isArray(inputs) ? inputs.length : 'not array');
                // Ensure inputs is an array
                const inputArray = Array.isArray(inputs) ? inputs : [inputs];
                const results = [];
                for (const input of inputArray) {
                    const result = await this.invoke(input, options);
                    results.push(result);
                }
                return results;
            },
            async transform(generator, options) {
                console.log('🔄 transform method called');
                return this.invoke(generator, options);
            },
            pipe(other) {
                console.log('🔗 pipe method called');
                return {
                    ...this,
                    async invoke(input, options) {
                        const result = await languageModel.invoke(input, options);
                        return other.invoke(result, options);
                    }
                };
            },
            // Debug: Log when model is created
            get _debug() {
                console.log('Fusion Chat Model created with:', {
                    _llmType: this._llmType,
                    modelName: this.modelName,
                    supportsToolCalling: this.supportsToolCalling,
                    _modelType: this._modelType,
                    name: this.name
                });
                return true;
            },
            // Standard text generation call
            async call(messages) {
                console.log('📞 call method - delegating to invoke');
                return this.invoke(messages);
            },
            // Enhanced invoke method that handles both regular and tool-enabled calls
            async invoke(messages, options) {
                console.log('🔍 invoke called with messages type:', typeof messages, 'value:', messages);
                // Check if tools are provided in options
                const tools = options?.tools || [];
                const hasTools = tools.length > 0;
                // Simplified approach: Extract the actual user content and ignore complex structures
                let userContent = '';
                if (typeof messages === 'string') {
                    // Simple string
                    userContent = messages;
                }
                else if (Array.isArray(messages)) {
                    // Array of messages - extract content from each
                    userContent = messages.map(msg => {
                        if (typeof msg === 'string')
                            return msg;
                        if (msg && msg.content)
                            return msg.content;
                        if (msg && msg.kwargs && msg.kwargs.content)
                            return msg.kwargs.content;
                        return String(msg);
                    }).join('\n');
                }
                else if (messages && typeof messages === 'object') {
                    // Check if it's a LangChain ChatPromptValue object
                    if (messages.kwargs && messages.kwargs.messages && Array.isArray(messages.kwargs.messages)) {
                        console.log('🔗 Detected LangChain ChatPromptValue format - extracting content');
                        // Extract actual content from LangChain messages
                        userContent = messages.kwargs.messages.map((msg) => {
                            if (msg.kwargs && msg.kwargs.content) {
                                return msg.kwargs.content;
                            }
                            return String(msg);
                        }).join('\n');
                    }
                    else if (messages.content) {
                        userContent = messages.content;
                    }
                    else if (messages.text) {
                        userContent = messages.text;
                    }
                    else {
                        // Last resort - just use the content we got
                        userContent = 'Hello';
                    }
                }
                else {
                    userContent = 'Hello';
                }
                console.log('📝 Extracted user content:', JSON.stringify(userContent));
                // Create a simple message array
                const messageArray = [{ role: 'user', content: userContent }];
                console.log('📝 Normalized messageArray:', messageArray);
                // Convert messages to OpenAI format for better model compatibility
                const formattedMessages = messageArray.map((msg) => {
                    if (typeof msg === 'string') {
                        return { role: 'user', content: msg };
                    }
                    return {
                        role: msg.role || 'user',
                        content: msg.content || msg.text || String(msg)
                    };
                });
                // For Fusion API, use the user content directly as the prompt
                let prompt = userContent;
                console.log('📄 Final prompt being sent:', JSON.stringify(prompt));
                // If tools are provided, add them to the system prompt
                if (hasTools) {
                    const toolDescriptions = tools.map((tool) => {
                        const params = tool.parameters || tool.function?.parameters || {};
                        const paramDesc = Object.entries(params.properties || {})
                            .map(([name, info]) => `  - ${name}: ${info.description || info.type || 'parameter'}`)
                            .join('\n');
                        return `Tool: ${tool.name || tool.function?.name}
Description: ${tool.description || tool.function?.description}
Parameters:
${paramDesc}`;
                    }).join('\n\n');
                    prompt = `You have access to the following tools. When you need to call a tool, respond with a JSON object containing "tool_name" and "arguments" fields.

Available Tools:
${toolDescriptions}

---

${prompt}`;
                }
                // Let's try the EXACT same format as your working curl first
                const requestBody = {
                    prompt,
                    provider: 'neuroswitch'
                };
                console.log('🚀 Fusion API request (minimal like curl):', JSON.stringify(requestBody, null, 2));
                console.log('🔗 API URL:', `${baseUrl}/api/chat`);
                console.log('🔑 Authorization header:', `ApiKey ${String(credentials.apiKey).substring(0, 20)}...`);
                const response = await fetch(`${baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        Authorization: `ApiKey ${credentials.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });
                console.log('📡 Fusion API response status:', response.status, response.statusText);
                console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Fusion API error response:', errorText);
                    console.error('❌ Request that failed:', JSON.stringify(requestBody, null, 2));
                    throw new Error(`Fusion AI error: ${response.status} - ${errorText}`);
                }
                const data = await response.json();
                console.log('✅ Fusion API response data:', JSON.stringify(data, null, 2));
                const responseText = data.response?.text || data.text || '';
                // If tools were provided, try to parse tool calls from the response
                if (hasTools) {
                    try {
                        // Check if the response contains a tool call
                        const jsonMatch = responseText.match(/\{[^}]*"tool_name"[^}]*\}/);
                        if (jsonMatch) {
                            const toolCall = JSON.parse(jsonMatch[0]);
                            // Return in LangChain format with tool calls
                            return {
                                content: responseText,
                                tool_calls: [{
                                        id: `call_${Date.now()}`,
                                        type: 'function',
                                        function: {
                                            name: toolCall.tool_name,
                                            arguments: JSON.stringify(toolCall.arguments || {})
                                        }
                                    }]
                            };
                        }
                    }
                    catch (e) {
                        // If parsing fails, just return the text response
                        console.warn('Failed to parse tool call from response:', e);
                    }
                }
                // Return standard text response
                return {
                    content: responseText,
                    tool_calls: []
                };
            },
            // Bind tools method required by n8n
            bindTools(tools) {
                console.log('🔧 bindTools called with tools:', tools);
                // Create a new instance with bound tools
                const boundModel = {
                    ...this,
                    _boundTools: tools,
                    // Override invoke to always include the bound tools
                    async invoke(messages, options) {
                        return languageModel.invoke(messages, { ...options, tools });
                    },
                    // Keep the same call method
                    async call(messages) {
                        return this.invoke(messages);
                    },
                    // Ensure bound model also has tools calling support
                    get supportsToolCalling() {
                        console.log('🔍 boundModel checking supportsToolCalling - returning true');
                        return true;
                    }
                };
                return boundModel;
            },
            // Additional methods that some LangChain versions might expect
            withStructuredOutput(schema) {
                console.log('🏗️ withStructuredOutput called with schema:', schema);
                return this;
            },
            // Stream method (some agents might check for this)
            async stream(messages, options) {
                console.log('🌊 stream method called');
                const result = await this.invoke(messages, options);
                return [result];
            },
        };
        return {
            response: languageModel,
        };
    }
}
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map