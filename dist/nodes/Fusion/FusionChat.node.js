"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionChat = void 0;
class FusionChat {
    constructor() {
        this.description = {
            displayName: 'Fusion Chat',
            name: 'fusionChat',
            icon: 'file:fusion.svg',
            group: ['transform'],
            version: 1,
            subtitle: 'AI Chat via Fusion',
            description: 'Send messages to AI models via Fusion API',
            defaults: {
                name: 'Fusion Chat',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'fusionApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Chat',
                            value: 'chat',
                            action: 'Send chat message',
                            description: 'Send a message to AI model and get response',
                        },
                    ],
                    default: 'chat',
                },
                {
                    displayName: 'Model',
                    name: 'model',
                    type: 'options',
                    typeOptions: {
                        loadOptionsMethod: 'getModels',
                    },
                    default: 'neuroswitch',
                    description: 'Select which model/provider to use',
                },
                {
                    displayName: 'System Prompt',
                    name: 'systemPrompt',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    default: '',
                    placeholder: 'You are a helpful assistant...',
                    description: 'System prompt to set the behavior of the AI (optional)',
                },
                {
                    displayName: 'Message',
                    name: 'message',
                    type: 'string',
                    default: '',
                    placeholder: 'Enter your message here...',
                    description: 'The message to send to the AI model',
                    required: true,
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    options: [
                        {
                            displayName: 'Temperature',
                            name: 'temperature',
                            type: 'number',
                            default: 0.3,
                            description: 'Controls randomness in the response (0.0 to 1.0)',
                            typeOptions: {
                                minValue: 0,
                                maxValue: 1,
                                numberPrecision: 1,
                            },
                        },
                        {
                            displayName: 'Max Tokens',
                            name: 'maxTokens',
                            type: 'number',
                            default: 1024,
                            description: 'Maximum number of tokens to generate',
                            typeOptions: {
                                minValue: 1,
                                maxValue: 4096,
                            },
                        },
                        {
                            displayName: 'Top P',
                            name: 'topP',
                            type: 'number',
                            default: 1,
                            description: 'Controls diversity via nucleus sampling (0.0 to 1.0)',
                            typeOptions: {
                                minValue: 0,
                                maxValue: 1,
                                numberPrecision: 1,
                            },
                        },
                        {
                            displayName: 'Frequency Penalty',
                            name: 'frequencyPenalty',
                            type: 'number',
                            default: 0,
                            description: 'Penalizes new tokens based on their frequency in the text so far',
                            typeOptions: {
                                minValue: -2,
                                maxValue: 2,
                                numberPrecision: 1,
                            },
                        },
                        {
                            displayName: 'Presence Penalty',
                            name: 'presencePenalty',
                            type: 'number',
                            default: 0,
                            description: 'Penalizes new tokens based on whether they appear in the text so far',
                            typeOptions: {
                                minValue: -2,
                                maxValue: 2,
                                numberPrecision: 1,
                            },
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
                        const modelOptions = models
                            .filter((m) => m.is_active)
                            .map((m) => ({
                            name: `${m.provider}: ${m.name}`,
                            value: `${m.provider}:${m.id_string}`, // e.g. "openai:gpt-4o-mini"
                        }));
                        // Always include NeuroSwitch as the first option
                        modelOptions.unshift({
                            name: 'NeuroSwitch (auto routing)',
                            value: 'neuroswitch'
                        });
                        return modelOptions;
                    }
                    catch (error) {
                        console.error('Failed to load Fusion models:', error.message);
                        // Return fallback options
                        return [
                            { name: 'NeuroSwitch (auto routing)', value: 'neuroswitch' },
                            { name: 'OpenAI: GPT-4', value: 'openai:gpt-4' },
                            { name: 'Anthropic: Claude 3 Sonnet', value: 'anthropic:claude-3-sonnet' },
                            { name: 'Google: Gemini Pro', value: 'google:gemini-pro' },
                        ];
                    }
                },
            },
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            try {
                const credentials = await this.getCredentials('fusionApi');
                const baseUrl = credentials.baseUrl?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
                const model = this.getNodeParameter('model', i);
                const message = this.getNodeParameter('message', i);
                const systemPrompt = this.getNodeParameter('systemPrompt', i, '');
                const additionalFields = this.getNodeParameter('additionalFields', i, {});
                // Build the prompt
                let prompt = message;
                if (systemPrompt) {
                    prompt = `${systemPrompt}\n\nUser: ${message}`;
                }
                // Split provider / model from dropdown
                let provider = 'neuroswitch';
                let modelId = undefined;
                if (model && model.includes(':')) {
                    [provider, modelId] = model.split(':');
                    // Remove provider prefix from modelId if it exists (e.g., "openai/gpt-4o-mini" -> "gpt-4o-mini")
                    if (modelId && modelId.includes('/')) {
                        modelId = modelId.split('/')[1];
                    }
                }
                else if (model) {
                    provider = model; // Handle legacy "neuroswitch" or other single values
                }
                // Map provider names to match backend API expectations
                const providerMap = {
                    'anthropic': 'claude',
                    'google': 'gemini', // Backend expects "gemini" not "google"
                };
                const mappedProvider = providerMap[provider.toLowerCase()] || provider;
                const requestBody = {
                    prompt,
                    provider: mappedProvider,
                    temperature: additionalFields.temperature || 0.3,
                    max_tokens: additionalFields.maxTokens || 1024,
                    top_p: additionalFields.topP || 1,
                    frequency_penalty: additionalFields.frequencyPenalty || 0,
                    presence_penalty: additionalFields.presencePenalty || 0,
                };
                if (provider !== 'neuroswitch' && modelId) {
                    requestBody.model = modelId;
                }
                let response;
                try {
                    response = await this.helpers.httpRequest({
                        method: 'POST',
                        url: `${baseUrl}/api/chat`,
                        headers: {
                            Authorization: `ApiKey ${credentials.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: requestBody,
                    });
                }
                catch (error) {
                    console.error('Fusion API request failed:', error.message);
                    throw new Error(`Fusion API request failed: ${error.message}`);
                }
                returnData.push({
                    json: response,
                    pairedItem: { item: i },
                });
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: true,
                            message: error.message,
                            details: error.response?.data || error.response || 'Unknown error'
                        },
                        pairedItem: { item: i },
                    });
                }
                else {
                    throw error;
                }
            }
        }
        return [returnData];
    }
}
exports.FusionChat = FusionChat;
//# sourceMappingURL=FusionChat.node.js.map