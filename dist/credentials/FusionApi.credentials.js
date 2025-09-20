"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionApi = void 0;
class FusionApi {
    constructor() {
        this.name = 'fusionApi';
        this.displayName = 'Fusion API';
        this.documentationUrl = 'https://fusion.mcp4.ai/docs';
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
                default: 'https://fusion.mcp4.ai',
                required: false,
                description: 'Base URL for the Fusion AI API (leave default unless using custom endpoint)',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                headers: {
                    Authorization: '=Bearer {{$credentials.apiKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/api/user/profile',
                method: 'GET',
            },
        };
    }
}
exports.FusionApi = FusionApi;
//# sourceMappingURL=FusionApi.credentials.js.map