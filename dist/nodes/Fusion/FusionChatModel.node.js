"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionChatModel = void 0;
// LangChain imports with fallback handling
let ChatOpenAI;
try {
    const openai = require('@langchain/openai');
    ChatOpenAI = openai.ChatOpenAI;
}
catch (error) {
    // Fallback implementation when LangChain is not available
    ChatOpenAI = class ChatOpenAI {
        constructor(opts) {
            Object.assign(this, opts);
        }
        async invoke(messages) {
            // This is a basic fallback - in real usage, LangChain should be available
            throw new Error('LangChain is required for FusionChatModel to work properly');
        }
    };
}
/**
 * Custom ChatOpenAI class that works with Fusion API
 */
class FusionChatOpenAI extends ChatOpenAI {
    constructor(opts) {
        // Initialize with dummy OpenAI config since we'll override the API calls
        super({
            ...opts,
            apiKey: 'fusion-placeholder', // We'll use Fusion API instead
            configuration: {
                baseURL: opts.baseURL,
            },
        });
        this.fusionApiKey = opts.apiKey;
        this.fusionBaseUrl = opts.baseURL;
        this.fusionProvider = opts.provider;
    }
    async _generate(messages, options) {
        // Convert LangChain messages to simple prompt
        const prompt = messages
            .map((msg) => {
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            return content;
        })
            .join('\n');
        const response = await fetch(`${this.fusionBaseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                Authorization: `ApiKey ${this.fusionApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                provider: this.fusionProvider,
                model: this.model,
                temperature: this.temperature || 0.7,
                max_tokens: this.maxTokens || 1024,
                top_p: this.topP || 1,
                frequency_penalty: this.frequencyPenalty || 0,
                presence_penalty: this.presencePenalty || 0,
            }),
        });
        if (!response.ok) {
            throw new Error(`Fusion API error: ${response.status} - ${await response.text()}`);
        }
        const data = await response.json();
        const text = data?.response?.text ?? data?.text ?? '';
        // Return in LangChain expected format
        return {
            generations: [{
                    text,
                    message: {
                        content: text,
                        response_metadata: {
                            model: data?.model,
                            provider: data?.provider,
                            tokens: data?.tokens,
                            cost: data?.cost_charged_to_credits,
                        },
                    },
                }],
            llmOutput: {
                model: data?.model,
                provider: data?.provider,
                tokens: data?.tokens,
                cost: data?.cost_charged_to_credits,
            },
        };
    }
}
class FusionChatModel {
    constructor() {
        this.description = {
            displayName: 'Fusion Chat Model',
            name: 'fusionChatModel',
            icon: 'file:fusion.svg',
            group: ['transform'],
            version: [1],
            description: 'For advanced usage with an AI chain',
            defaults: {
                name: 'Fusion Chat Model',
            },
            codex: {
                categories: ['AI'],
                subcategories: {
                    AI: ['Language Models', 'Root Nodes'],
                    'Language Models': ['Chat Models (Recommended)'],
                },
                resources: {
                    primaryDocumentation: [
                        {
                            url: 'https://api.mcp4.ai/api-docs/',
                        },
                    ],
                },
            },
            inputs: [],
            outputs: ["ai_languageModel" /* NodeConnectionType.AiLanguageModel */],
            outputNames: ['Model'],
            credentials: [
                {
                    name: 'fusionApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Model',
                    name: 'model',
                    type: 'options',
                    description: 'The model which will generate the completion.',
                    typeOptions: {
                        loadOptionsMethod: 'getModels',
                    },
                    default: 'neuroswitch',
                },
                {
                    displayName: 'Options',
                    name: 'options',
                    placeholder: 'Add Option',
                    description: 'Additional options to add',
                    type: 'collection',
                    default: {},
                    options: [
                        {
                            displayName: 'Frequency Penalty',
                            name: 'frequencyPenalty',
                            default: 0,
                            typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
                            description: 'Positive values penalize new tokens based on their existing frequency in the text so far',
                            type: 'number',
                        },
                        {
                            displayName: 'Maximum Number of Tokens',
                            name: 'maxTokens',
                            default: 1024,
                            description: 'The maximum number of tokens to generate in the completion',
                            type: 'number',
                            typeOptions: {
                                maxValue: 32768,
                                minValue: 1,
                            },
                        },
                        {
                            displayName: 'Presence Penalty',
                            name: 'presencePenalty',
                            default: 0,
                            typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
                            description: 'Positive values penalize new tokens based on whether they appear in the text so far',
                            type: 'number',
                        },
                        {
                            displayName: 'Sampling Temperature',
                            name: 'temperature',
                            default: 0.7,
                            typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
                            description: 'Controls randomness: Lowering results in less random completions',
                            type: 'number',
                        },
                        {
                            displayName: 'Timeout',
                            name: 'timeout',
                            default: 60000,
                            description: 'Maximum amount of time a request is allowed to take in milliseconds',
                            type: 'number',
                        },
                        {
                            displayName: 'Max Retries',
                            name: 'maxRetries',
                            default: 2,
                            description: 'Maximum number of retries to attempt',
                            type: 'number',
                        },
                        {
                            displayName: 'Top P',
                            name: 'topP',
                            default: 1,
                            typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
                            description: 'Controls diversity via nucleus sampling',
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
                        const baseUrl = (credentials.baseUrl ||
                            'https://api.mcp4.ai').replace(/\/+$/, '');
                        const response = await this.helpers.httpRequest({
                            method: 'GET',
                            url: `${baseUrl}/api/models`,
                            headers: {
                                Authorization: `ApiKey ${credentials.apiKey}`,
                                'Content-Type': 'application/json',
                            },
                        });
                        const models = (response.data || response || []);
                        return models.map((m) => ({
                            name: `${m.name || m.id_string} - $${m.input_cost_per_million_tokens || 'N/A'}/1M tokens`,
                            value: m.id_string || m.id,
                        }));
                    }
                    catch {
                        return [{ name: 'NeuroSwitch', value: 'neuroswitch' }];
                    }
                },
            },
        };
    }
    async supplyData(itemIndex) {
        const credentials = await this.getCredentials('fusionApi');
        const baseUrl = credentials.baseUrl || 'https://api.mcp4.ai';
        const modelName = this.getNodeParameter('model', itemIndex);
        const options = this.getNodeParameter('options', itemIndex, {});
        // Determine provider from model name
        const provider = modelName.includes('/') ? modelName.split('/')[0] : 'neuroswitch';
        const model = new FusionChatOpenAI({
            apiKey: String(credentials.apiKey),
            baseURL: baseUrl,
            model: modelName,
            provider,
            ...options,
            timeout: options.timeout ?? 60000,
            maxRetries: options.maxRetries ?? 2,
        });
        return {
            response: model,
        };
    }
}
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map