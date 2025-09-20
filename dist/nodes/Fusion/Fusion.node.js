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
            subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
            description: 'Interact with Fusion AI via NeuroSwitch multi-provider orchestration',
            defaults: {
                name: 'Fusion AI',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'fusionApi',
                    required: true,
                },
            ],
            requestDefaults: {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            },
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
                            description: 'Send messages to AI providers through Fusion',
                        },
                        {
                            name: 'Credits',
                            value: 'credits',
                            description: 'Manage your Fusion AI credits',
                        },
                        {
                            name: 'Usage',
                            value: 'usage',
                            description: 'View usage logs and analytics',
                        },
                    ],
                    default: 'chat',
                },
                // Chat Operations
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
                            value: 'sendMessage',
                            description: 'Send a message to AI providers via Fusion',
                            action: 'Send a message',
                        },
                    ],
                    default: 'sendMessage',
                },
                // Credits Operations
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: ['credits'],
                        },
                    },
                    options: [
                        {
                            name: 'Get Balance',
                            value: 'getBalance',
                            description: 'Get current credit balance and transaction history',
                            action: 'Get credit balance',
                        },
                    ],
                    default: 'getBalance',
                },
                // Usage Operations
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            resource: ['usage'],
                        },
                    },
                    options: [
                        {
                            name: 'Get Logs',
                            value: 'getLogs',
                            description: 'Get usage logs and analytics',
                            action: 'Get usage logs',
                        },
                    ],
                    default: 'getLogs',
                },
                // Chat Parameters
                {
                    displayName: 'Prompt',
                    name: 'prompt',
                    type: 'string',
                    required: true,
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
                    default: '',
                    placeholder: 'Enter your message here...',
                    description: 'The message or prompt to send to the AI',
                },
                {
                    displayName: 'Provider',
                    name: 'provider',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
                    options: [
                        {
                            name: 'NeuroSwitch (Auto-Select)',
                            value: 'neuroswitch',
                            description: 'Let Fusion AI automatically select the best provider',
                        },
                        {
                            name: 'OpenAI',
                            value: 'openai',
                            description: 'Use OpenAI models directly',
                        },
                        {
                            name: 'Claude (Anthropic)',
                            value: 'claude',
                            description: 'Use Claude models directly',
                        },
                        {
                            name: 'Gemini (Google)',
                            value: 'gemini',
                            description: 'Use Gemini models directly',
                        },
                    ],
                    default: 'neuroswitch',
                    description: 'Which AI provider to use',
                },
                {
                    displayName: 'Model',
                    name: 'model',
                    type: 'string',
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
                    default: '',
                    placeholder: 'e.g., gpt-4o, claude-3-sonnet',
                    description: 'Specific model to use (optional, will use provider default if empty)',
                },
                {
                    displayName: 'Mode',
                    name: 'mode',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
                    options: [
                        {
                            name: 'Chat',
                            value: 'chat',
                            description: 'Conversational chat mode',
                        },
                        {
                            name: 'Completion',
                            value: 'completion',
                            description: 'Text completion mode',
                        },
                        {
                            name: 'Generation',
                            value: 'generation',
                            description: 'Content generation mode',
                        },
                    ],
                    default: 'chat',
                    description: 'The mode of interaction with the AI',
                },
                {
                    displayName: 'Image (Base64)',
                    name: 'image',
                    type: 'string',
                    displayOptions: {
                        show: {
                            resource: ['chat'],
                            operation: ['sendMessage'],
                        },
                    },
                    default: '',
                    placeholder: 'data:image/jpeg;base64,/9j/4AAQ...',
                    description: 'Base64-encoded image for vision models (optional)',
                },
                // Usage Parameters
                {
                    displayName: 'Options',
                    name: 'options',
                    type: 'collection',
                    displayOptions: {
                        show: {
                            resource: ['usage'],
                            operation: ['getLogs'],
                        },
                    },
                    default: {},
                    placeholder: 'Add Option',
                    options: [
                        {
                            displayName: 'Limit',
                            name: 'limit',
                            type: 'number',
                            default: 50,
                            typeOptions: {
                                minValue: 1,
                                maxValue: 100,
                            },
                            description: 'Number of items per page (max 100)',
                        },
                        {
                            displayName: 'Page',
                            name: 'page',
                            type: 'number',
                            default: 1,
                            typeOptions: {
                                minValue: 1,
                            },
                            description: 'Page number to retrieve',
                        },
                        {
                            displayName: 'Start Date',
                            name: 'start_date',
                            type: 'dateTime',
                            default: '',
                            description: 'Filter logs from this date onwards',
                        },
                        {
                            displayName: 'End Date',
                            name: 'end_date',
                            type: 'dateTime',
                            default: '',
                            description: 'Filter logs up to this date',
                        },
                        {
                            displayName: 'Provider',
                            name: 'provider',
                            type: 'options',
                            options: [
                                {
                                    name: 'OpenAI',
                                    value: 'openai',
                                },
                                {
                                    name: 'Claude',
                                    value: 'claude',
                                },
                                {
                                    name: 'Gemini',
                                    value: 'gemini',
                                },
                            ],
                            default: '',
                            description: 'Filter by specific provider',
                        },
                    ],
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < items.length; i++) {
            try {
                let responseData;
                if (resource === 'chat') {
                    if (operation === 'sendMessage') {
                        const prompt = this.getNodeParameter('prompt', i);
                        const provider = this.getNodeParameter('provider', i);
                        const model = this.getNodeParameter('model', i);
                        const mode = this.getNodeParameter('mode', i);
                        const image = this.getNodeParameter('image', i);
                        const body = {
                            prompt,
                            provider,
                            mode,
                        };
                        if (model) {
                            body.model = model;
                        }
                        if (image) {
                            body.image = image;
                        }
                        const credentials = await this.getCredentials('fusionApi');
                        const baseUrl = credentials?.baseUrl || 'https://api.mcp4.ai';
                        const options = {
                            method: 'POST',
                            url: `${baseUrl}/api/chat`,
                            body,
                            json: true,
                        };
                        responseData = await this.helpers.requestWithAuthentication.call(this, 'fusionApi', options);
                    }
                }
                else if (resource === 'credits') {
                    if (operation === 'getBalance') {
                        const credentials = await this.getCredentials('fusionApi');
                        const baseUrl = credentials?.baseUrl || 'https://api.mcp4.ai';
                        const options = {
                            method: 'GET',
                            url: `${baseUrl}/api/user/credits`,
                            json: true,
                        };
                        responseData = await this.helpers.requestWithAuthentication.call(this, 'fusionApi', options);
                    }
                }
                else if (resource === 'usage') {
                    if (operation === 'getLogs') {
                        const additionalFields = this.getNodeParameter('options', i);
                        const qs = {};
                        if (additionalFields.limit) {
                            qs.limit = additionalFields.limit;
                        }
                        if (additionalFields.page) {
                            qs.page = additionalFields.page;
                        }
                        if (additionalFields.start_date) {
                            qs.start_date = new Date(additionalFields.start_date).toISOString();
                        }
                        if (additionalFields.end_date) {
                            qs.end_date = new Date(additionalFields.end_date).toISOString();
                        }
                        if (additionalFields.provider) {
                            qs.provider = additionalFields.provider;
                        }
                        const credentials = await this.getCredentials('fusionApi');
                        const baseUrl = credentials?.baseUrl || 'https://api.mcp4.ai';
                        const options = {
                            method: 'GET',
                            url: `${baseUrl}/api/user/activity`,
                            qs,
                            json: true,
                        };
                        responseData = await this.helpers.requestWithAuthentication.call(this, 'fusionApi', options);
                    }
                }
                if (responseData) {
                    returnData.push({
                        json: responseData,
                        pairedItem: {
                            item: i,
                        },
                    });
                }
            }
            catch (error) {
                // Handle errors gracefully
                const errorResponse = {
                    error: true,
                    message: error.message || 'An unknown error occurred',
                    statusCode: error.statusCode || 500,
                    timestamp: new Date().toISOString(),
                };
                if (this.continueOnFail()) {
                    returnData.push({
                        json: errorResponse,
                        pairedItem: {
                            item: i,
                        },
                    });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.Fusion = Fusion;
//# sourceMappingURL=Fusion.node.js.map