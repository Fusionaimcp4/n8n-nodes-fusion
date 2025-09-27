import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

export class Fusion implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fusion AI',
		name: 'fusion',
		icon: 'file:fusion.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Fusion AI (NeuroSwitch multi-provider orchestration)',
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
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Send Message',
						value: 'sendMessage',
						action: 'Send a message to AI model',
						description: 'Send a message to an AI model and get a response',
					},
					{
						name: 'List Models',
						value: 'listModels',
						action: 'List available models',
						description: 'Get a list of available AI models',
					},
					{
						name: 'Get Account Info',
						value: 'getAccount',
						action: 'Get account information',
						description: 'Get account information and usage',
					},
				],
				default: 'sendMessage',
			},
			// Chat parameters
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{ name: 'NeuroSwitch (auto routing)', value: 'neuroswitch' },
					{ name: 'OpenAI: GPT-4', value: 'openai:gpt-4' },
					{ name: 'Anthropic: Claude 3 Sonnet', value: 'anthropic:claude-3-sonnet' },
					{ name: 'Google: Gemini Pro', value: 'google:gemini-pro' },
				],
				default: 'neuroswitch',
				description: 'The AI model to use for chat completion',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
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
				default: '',
				placeholder: 'You are a helpful assistant...',
				description: 'System prompt to set the behavior of the AI (optional)',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
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


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('fusionApi');
				const baseUrl = (credentials.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData: any;

				if (operation === 'sendMessage') {
					const model = this.getNodeParameter('model', i) as string;
					const message = this.getNodeParameter('message', i) as string;
					const systemPrompt = this.getNodeParameter('systemPrompt', i, '') as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

					// Build the prompt
					let prompt = message;
					if (systemPrompt) {
						prompt = `${systemPrompt}\n\nUser: ${message}`;
					}

					// Split provider / model from dropdown
					let provider = 'neuroswitch';
					let modelId: string | undefined = undefined;
					
					if (model && model.includes(':')) {
						[provider, modelId] = model.split(':');
						// Remove provider prefix from modelId if it exists (e.g., "openai/gpt-4o-mini" -> "gpt-4o-mini")
						if (modelId && modelId.includes('/')) {
							modelId = modelId.split('/')[1];
						}
					} else if (model) {
						provider = model; // Handle legacy "neuroswitch" or other single values
					}

					const requestBody: any = {
						prompt,
						provider,
						temperature: additionalFields.temperature || 0.3,
						max_tokens: additionalFields.maxTokens || 1024,
						top_p: additionalFields.topP || 1,
						frequency_penalty: additionalFields.frequencyPenalty || 0,
						presence_penalty: additionalFields.presencePenalty || 0,
					};

					if (provider !== 'neuroswitch' && modelId) {
						requestBody.model = modelId;
					}

					responseData = await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseUrl}/api/chat`,
						headers: {
							Authorization: `ApiKey ${credentials.apiKey}`,
							'Content-Type': 'application/json',
						},
						body: requestBody,
					});

				} else if (operation === 'listModels') {
					responseData = await this.helpers.httpRequest({
						method: 'GET',
						url: `${baseUrl}/api/models`,
						headers: {
							Authorization: `ApiKey ${credentials.apiKey}`,
							'Content-Type': 'application/json',
						},
					});

				} else if (operation === 'getAccount') {
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

			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { 
							error: true, 
							message: error.message,
							details: error.response?.data || error.response || 'Unknown error'
						},
						pairedItem: { item: i },
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}