import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FusionApi implements ICredentialType {
	name = 'fusionApi';

	displayName = 'Fusion API';

	documentationUrl = 'https://api.mcp4.ai/api-docs/';

	noData = true;

	properties: INodeProperties[] = [
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

	authenticate = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=ApiKey {{$credentials.apiKey}}',
			},
		},
	} as const;

	test = {
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
	} as const;
}
