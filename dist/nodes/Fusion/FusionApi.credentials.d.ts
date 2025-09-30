import type { ICredentialType, INodeProperties } from 'n8n-workflow';
export declare class FusionApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    noData: boolean;
    properties: INodeProperties[];
    authenticate: {
        readonly type: "generic";
        readonly properties: {
            readonly headers: {
                readonly Authorization: "=ApiKey {{$credentials.apiKey}}";
            };
        };
    };
    test: {
        readonly request: {
            readonly baseURL: "={{$credentials.baseUrl}}";
            readonly url: "/api/chat";
            readonly method: "POST";
            readonly body: {
                readonly prompt: "Test connection";
                readonly provider: "neuroswitch";
                readonly max_tokens: 1;
            };
        };
    };
}
//# sourceMappingURL=FusionApi.credentials.d.ts.map