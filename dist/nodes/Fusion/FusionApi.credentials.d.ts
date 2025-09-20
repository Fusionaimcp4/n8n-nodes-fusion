import type { ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class FusionApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    properties: INodeProperties[];
    authenticate: {
        readonly type: "generic";
        readonly properties: {
            readonly headers: {
                readonly Authorization: "=Bearer {{$credentials.apiKey}}";
            };
        };
    };
    test: {
        readonly request: {
            readonly baseURL: "={{$credentials.baseUrl}}";
            readonly url: "/api/user/profile";
            readonly method: "GET";
        };
    };
}
//# sourceMappingURL=FusionApi.credentials.d.ts.map