"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionApi = void 0;
class FusionApi {
    constructor() {
        this.name = 'fusionApi';
        this.displayName = 'Fusion API';
        this.documentationUrl = 'https://api.mcp4.ai/api-docs/';
        this.noData = true;
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
                description: 'Your Fusion AI API key for authentication',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://api.mcp4.ai',
                required: false,
                description: 'Base URL for the Fusion AI API',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=ApiKey {{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/api/chat',
                method: 'POST',
                body: {
                    prompt: 'Test connection',
                    provider: 'neuroswitch',
                    max_tokens: 1,
                },
            },
        };
    }
}
exports.FusionApi = FusionApi;
//# sourceMappingURL=FusionApi.credentials.js.map