"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionChatModel = void 0;
const messages_1 = require("@langchain/core/messages");
const chat_models_1 = require("@langchain/core/language_models/chat_models");
/**
 * Fusion LangChain chat wrapper with tool calling support
 */
class FusionLangChainChat extends chat_models_1.BaseChatModel {
    constructor(opts) {
        super({});
        this.apiKey = opts.apiKey;
        this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
        this.provider = opts.provider || 'neuroswitch';
        this.temperature = opts.temperature ?? 0.3;
        this.maxTokens = opts.maxTokens ?? 1024;
    }
    _llmType() {
        return 'fusion';
    }
    /** Tool calling support property */
    get supportsToolCalling() {
        console.log('🔍 n8n checking supportsToolCalling - returning true');
        return true;
    }
    /** Alternative tool calling property */
    get _supportsToolCalling() {
        console.log('🔍 n8n checking _supportsToolCalling - returning true');
        return true;
    }
    /** Additional tool support properties */
    get supportsToolChoice() {
        return true;
    }
    get supportsStructuredOutput() {
        return true;
    }
    /** Bind tools method required by n8n */
    bindTools(tools) {
        console.log('🔧 bindTools called with tools:', tools);
        // Store tools for use in _generate
        this._boundTools = tools;
        return this;
    }
    /** Enhanced invoke method that handles tool calls */
    async invoke(input, options) {
        console.log('🔍 invoke called with input type:', typeof input, 'value:', input);
        // Get bound tools or tools from options
        const tools = this._boundTools || options?.tools || [];
        // Convert input to BaseMessage array
        let messages = [];
        if (typeof input === 'string') {
            messages = [{ content: input, role: 'user' }];
        }
        else if (Array.isArray(input)) {
            messages = input;
        }
        else if (input && input.content) {
            messages = [input];
        }
        // Add tools to options if available
        const enhancedOptions = tools.length > 0 ? { ...options, tools } : options;
        return this._generate(messages, enhancedOptions);
    }
    /** Convert LC messages -> plain prompt (simple join) */
    messagesToPrompt(messages) {
        const pick = (m) => {
            const c = m?.content;
            if (typeof c === 'string')
                return c;
            if (Array.isArray(c)) {
                return c
                    .map((p) => typeof p?.text === 'string' ? p.text : '')
                    .join('\n');
            }
            return String(c ?? '');
        };
        return messages.map(pick).filter(Boolean).join('\n');
    }
    /** Core generation for LangChain with tool calling support */
    async _generate(messages, options, _runManager) {
        const prompt = this.messagesToPrompt(messages);
        console.log('🔍 _generate called with prompt:', JSON.stringify(prompt));
        console.log('🔗 API URL:', `${this.baseUrl}/api/chat`);
        console.log('🔑 Authorization header:', `ApiKey ${String(this.apiKey).substring(0, 20)}...`);
        // Use the EXACT same format as your working curl
        const requestBody = {
            prompt,
            provider: this.provider,
            temperature: this.temperature,
            max_tokens: this.maxTokens
        };
        console.log('🚀 Fusion API request:', JSON.stringify(requestBody, null, 2));
        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                Authorization: `ApiKey ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        console.log('📡 Fusion API response status:', res.status, res.statusText);
        console.log('📡 Response headers:', Object.fromEntries(res.headers.entries()));
        if (!res.ok) {
            const errorText = await res.text();
            console.error('❌ Fusion API error response:', errorText);
            console.error('❌ Request that failed:', JSON.stringify(requestBody, null, 2));
            throw new Error(`Fusion AI error: ${res.status} - ${errorText}`);
        }
        const data = (await res.json());
        console.log('✅ Fusion API response data:', JSON.stringify(data, null, 2));
        const text = data?.response?.text ?? data?.text ?? '';
        console.log('🎯 Extracted response text:', text);
        // Check if tools are provided in options and try to parse tool calls
        const tools = options?.tools || [];
        const hasTools = tools.length > 0;
        let toolCalls = [];
        if (hasTools) {
            try {
                // Check if the response contains a tool call
                const jsonMatch = text.match(/\{[^}]*"tool_name"[^}]*\}/);
                if (jsonMatch) {
                    const toolCall = JSON.parse(jsonMatch[0]);
                    toolCalls = [{
                            id: `call_${Date.now()}`,
                            type: 'function',
                            function: {
                                name: toolCall.tool_name,
                                arguments: JSON.stringify(toolCall.arguments || {})
                            }
                        }];
                    console.log('🔧 Tool call detected:', toolCalls);
                }
            }
            catch (e) {
                console.warn('Failed to parse tool call from response:', e);
            }
        }
        // Construct AIMessage with tool calling support
        const aiMsg = new messages_1.AIMessage({
            content: text,
            additional_kwargs: toolCalls.length > 0 ? { tool_calls: toolCalls } : {},
            response_metadata: {
                model: data?.model,
                provider: data?.provider,
                tokens: data?.tokens,
                cost: data?.cost_charged_to_credits,
            },
        });
        // Construct generation object (typed) with LangChain identifiers
        const generation = {
            text,
            message: aiMsg,
            generationInfo: {
                model: data?.model,
                provider: data?.provider,
                tokens: data?.tokens,
                cost: data?.cost_charged_to_credits,
                tool_calls: toolCalls,
            },
        };
        console.log('📤 Final ChatGeneration object:', JSON.stringify(generation, null, 2));
        // Return full ChatResult
        const chatResult = {
            generations: [generation],
            llmOutput: {
                model: data?.model,
                provider: data?.provider,
                tokens: data?.tokens,
                cost: data?.cost_charged_to_credits,
            },
        };
        console.log('📋 Returning ChatResult:', JSON.stringify(chatResult, null, 2));
        return chatResult;
    }
}
class FusionChatModel {
    constructor() {
        this.description = {
            displayName: 'Fusion Chat Model',
            name: 'fusionChatModel',
            icon: 'file:fusion.svg',
            group: ['transform'],
            version: 1,
            subtitle: 'Language Model',
            description: 'Chat model for Fusion AI (supports tools)',
            defaults: { name: 'Fusion Chat Model' },
            inputs: [],
            outputs: ['ai_languageModel'],
            credentials: [{ name: 'fusionApi', required: true }],
            codex: {
                categories: ['AI', 'Language Models'],
                resources: {
                    primaryDocumentation: [
                        { url: 'https://api.mcp4.ai/api-docs/' },
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
                            typeOptions: {
                                maxValue: 1,
                                minValue: 0,
                                numberPrecision: 1
                            },
                            description: 'Controls randomness in the response. Lower values make responses more focused and deterministic.',
                            type: 'number',
                        },
                        {
                            displayName: 'Max Tokens',
                            name: 'maxTokens',
                            default: 1024,
                            typeOptions: {
                                maxValue: 4096,
                                minValue: 1
                            },
                            description: 'The maximum number of tokens to generate in the chat completion',
                            type: 'number',
                        },
                        {
                            displayName: 'Top P',
                            name: 'topP',
                            default: 1,
                            typeOptions: {
                                maxValue: 1,
                                minValue: 0,
                                numberPrecision: 1
                            },
                            description: 'An alternative to sampling with temperature, called nucleus sampling',
                            type: 'number',
                        },
                        {
                            displayName: 'Frequency Penalty',
                            name: 'frequencyPenalty',
                            default: 0,
                            typeOptions: {
                                maxValue: 2,
                                minValue: -2,
                                numberPrecision: 1
                            },
                            description: 'Positive values penalize new tokens based on their existing frequency in the text',
                            type: 'number',
                        },
                        {
                            displayName: 'Presence Penalty',
                            name: 'presencePenalty',
                            default: 0,
                            typeOptions: {
                                maxValue: 2,
                                minValue: -2,
                                numberPrecision: 1
                            },
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
        console.log('🔧 supplyData called with model:', model, 'options:', options);
        const fusionModel = new FusionLangChainChat({
            apiKey: String(credentials.apiKey),
            baseUrl,
            provider: model || 'neuroswitch',
            temperature: options.temperature ?? 0.3,
            maxTokens: options.maxTokens ?? 1024,
        });
        console.log('✅ Created FusionLangChainChat model with tool calling support');
        // The AI Agent expects a LangChain ChatModel instance here
        return { response: fusionModel };
    }
}
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map