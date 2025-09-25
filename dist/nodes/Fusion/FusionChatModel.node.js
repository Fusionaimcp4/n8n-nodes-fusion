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
        // Create a language model instance that mimics OpenAI/OpenRouter behavior
        const languageModel = {
            provider: 'fusion',
            modelName: model,
            temperature: options.temperature ?? 0.3,
            maxTokens: options.maxTokens ?? 1024,
            topP: options.topP ?? 1,
            frequencyPenalty: options.frequencyPenalty ?? 0,
            presencePenalty: options.presencePenalty ?? 0,
            supportsTools: true,
            supportsFunctions: true,
            supportsJsonMode: true,
            // Method that n8n calls for chat completions
            async call(messages, options) {
                const prompt = messages.map((msg) => msg.content).join('\n');
                const response = await fetch(`${baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        Authorization: `ApiKey ${credentials.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt,
                        provider: model.includes('/') ? model.split('/')[0] : 'neuroswitch',
                        model,
                        temperature: options?.temperature ?? this.temperature,
                        max_tokens: options?.max_tokens ?? this.maxTokens,
                        top_p: options?.top_p ?? this.topP,
                        frequency_penalty: options?.frequency_penalty ?? this.frequencyPenalty,
                        presence_penalty: options?.presence_penalty ?? this.presencePenalty,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`Fusion AI API error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                return {
                    text: data.response?.text || data.text || '',
                    response: data,
                };
            },
            // Tools-specific methods
            async callWithTools(messages, tools, options) {
                return this.call(messages, options);
            },
        };
        return {
            response: languageModel,
        };
    }
}
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map