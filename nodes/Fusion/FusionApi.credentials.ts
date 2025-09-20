import type {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FusionApi implements ICredentialType {
	name = 'fusionApi';

	displayName = 'Fusion API';

	documentationUrl = 'https://api.mcp4.ai/docs';

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
