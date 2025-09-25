"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fusion = void 0;
class Fusion {
    constructor() {
        this.description = {
            displayName: 'Fusion AI',
            name: 'fusion',
            icon: 'file:fusion.svg',
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
            description: 'Interact with Fusion AI (NeuroSwitch multi-provider orchestration)',
            defaults: {
                name: 'Fusion AI',
            },
            inputs: ["main" /* NodeConnectionType.Main */],
            outputs: ["main" /* NodeConnectionType.Main */],
            credentials: [
                {
                    name: 'fusionApi',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Chat',
                            value: 'chat',
                            description: 'AI Chat operations',
                        },
                        {
                            name: 'Models',
                            value: 'models',
                            description: 'AI Models operations',
                        },
                        {
                            name: 'Account',
                            value: 'account',
                            description: 'Account operations',
                        },
                    ],
                    default: 'chat',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                        },
                    },
                    options: [
                        {
                            name: 'Send Message',
                            value: 'chat',
                            action: 'Send a message to AI model',
                            description: 'Send a message to an AI model and get a response',
                        },
                    ],
                    default: 'chat',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: ['models'],
                        },
                    },
                    options: [
                        {
                            name: 'List Models',
                            value: 'listModels',
                            action: 'List available models',
                            description: 'Get a list of available AI models',
                        },
                    ],
                    default: 'listModels',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: ['account'],
                        },
                    },
                    options: [
                        {
                            name: 'Get Info',
                            value: 'getAccount',
                            action: 'Get account information',
                            description: 'Get account information and usage',
                        },
                    ],
                    default: 'getAccount',
                },
                // Chat parameters
                {
                    displayName: 'Model',
                    name: 'model',
                    type: 'options',
                    typeOptions: {
                        loadOptionsMethod: 'getModels',
                    },
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
                    default: 'neuroswitch',
                    description: 'The AI model to use for chat completion',
                },
                {
                    displayName: 'Message',
                    name: 'message',
                    type: 'string',
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
                    default: '',
                    placeholder: 'Enter your message here...',
                    description: 'The message to send to the AI model',
                    required: true,
                },
                {
                    displayName: 'System Prompt',
                    name: 'systemPrompt',
                    type: 'string',
                    typeOptions: {
                        rows: 3,
                    },
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
                    default: '',
                    placeholder: 'You are a helpful assistant...',
                    description: 'System prompt to set the behavior of the AI (optional)',
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
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
                        return models.map((model) => ({
                            name: `${model.name || model.id_string} - $${model.input_cost_per_million_tokens || 'N/A'}/1M input`,
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
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        for (let i = 0; i < items.length; i++) {
            try {
                const credentials = await this.getCredentials('fusionApi');
                const baseUrl = credentials.baseUrl?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
                const resource = this.getNodeParameter('resource', i);
                const operation = this.getNodeParameter('operation', i);
                let responseData;
                if (resource === 'chat' && operation === 'chat') {
                    const model = this.getNodeParameter('model', i);
                    const message = this.getNodeParameter('message', i);
                    const systemPrompt = this.getNodeParameter('systemPrompt', i, '');
                    const additionalFields = this.getNodeParameter('additionalFields', i, {});
                    // Build the prompt
                    let prompt = message;
                    if (systemPrompt) {
                        prompt = `${systemPrompt}\n\nUser: ${message}`;
                    }
                    const requestBody = {
                        prompt,
                        provider: model.includes('/') ? model.split('/')[0] : 'neuroswitch',
                        model: model,
                        temperature: additionalFields.temperature || 0.3,
                        max_tokens: additionalFields.maxTokens || 1024,
                        top_p: additionalFields.topP || 1,
                        frequency_penalty: additionalFields.frequencyPenalty || 0,
                        presence_penalty: additionalFields.presencePenalty || 0,
                    };
                    responseData = await this.helpers.httpRequest({
                        method: 'POST',
                        url: `${baseUrl}/api/chat`,
                        headers: {
                            Authorization: `ApiKey ${credentials.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: requestBody,
                    });
                }
                else if (resource === 'models' && operation === 'listModels') {
                    responseData = await this.helpers.httpRequest({
                        method: 'GET',
                        url: `${baseUrl}/api/models`,
                        headers: {
                            Authorization: `ApiKey ${credentials.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    });
                }
                else if (resource === 'account' && operation === 'getAccount') {
                    responseData = await this.helpers.httpRequest({
                        method: 'GET',
                        url: `${baseUrl}/api/account`,
                        headers: {
                            Authorization: `ApiKey ${credentials.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    });
                }
                returnData.push({
                    json: responseData,
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
exports.Fusion = Fusion;
//# sourceMappingURL=Fusion.node.js.map