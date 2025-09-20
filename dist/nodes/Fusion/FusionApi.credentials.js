"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionApi = void 0;
class FusionApi {
    constructor() {
        this.name = 'fusionApi';
        this.displayName = 'Fusion API';
        this.documentationUrl = 'https://api.mcp4.ai/docs';
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
                type: 'options',
                options: [
                    {
                        name: 'api.fusionai.com (Recommended)',
                        value: 'https://api.fusionai.com/v1',
                    },
                    {
                        name: 'api.mcp4.ai',
                        value: 'https://api.mcp4.ai',
                    },
                ],
                default: 'https://api.fusionai.com/v1',
                required: false,
                description: 'Base URL for the Fusion AI API',
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