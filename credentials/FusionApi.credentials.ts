import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FusionApi implements ICredentialType {
	name = 'fusionApi';

	displayName = 'Fusion API';

	documentationUrl = 'https://fusion.mcp4.ai/docs';

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
			default: 'https://fusion.mcp4.ai',
			required: false,
			description: 'Base URL for the Fusion AI API (leave default unless using custom endpoint)',
		},
	];

	authenticate = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	} as const;

	test = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/user/profile',
			method: 'GET',
		},
	} as const;
}
