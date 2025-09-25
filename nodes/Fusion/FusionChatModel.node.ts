import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	NodeConnectionType,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';

export class FusionChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fusion Chat Model',
		name: 'fusionChatModel',
		icon: 'file:fusion.svg',
		group: ['ai'],
		version: 1,
		subtitle: 'Language Model',
		description: 'Chat Model for Fusion AI',
		defaults: {
			name: 'Fusion Chat Model',
		},
		inputs: [],
		outputs: [NodeConnectionType.AiLanguageModel],
		credentials: [
			{
				name: 'fusionApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI', 'Language Models'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://api.mcp4.ai/api-docs/',
					},
				],
			},
		},
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getModels',
				},
				default: 'neuroswitch',
				description: 'Model to use for the chat completion',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to configure',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Temperature',
						name: 'temperature',
						default: 0.3,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description: 'Controls randomness in the response. Lower values make responses more focused and deterministic.',
						type: 'number',
					},
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						default: 1024,
						typeOptions: { maxValue: 4096, minValue: 1 },
						description: 'The maximum number of tokens to generate in the chat completion',
						type: 'number',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description: 'An alternative to sampling with temperature, called nucleus sampling',
						type: 'number',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description: 'Positive values penalize new tokens based on their existing frequency in the text',
						type: 'number',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description: 'Positive values penalize new tokens based on whether they appear in the text so far',
						type: 'number',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions) {
				try {
					const credentials = await this.getCredentials('fusionApi');
					const baseUrl = (credentials.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';

					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${baseUrl}/api/models`,
						headers: {
							Authorization: `ApiKey ${credentials.apiKey}`,
							'Content-Type': 'application/json',
						},
					});

					const models = (response.data || response || []) as any[];
					return models.map((model: any) => ({
						name: `${model.name || model.id_string} ($${model.input_cost_per_million_tokens || 'N/A'}/1M)`,
						value: model.id_string || model.id,
					}));
				} catch (error: any) {
					console.warn('Failed to load Fusion models:', error.message);
					return [
						{ name: 'NeuroSwitch', value: 'neuroswitch' },
						{ name: 'OpenAI GPT-4', value: 'openai/gpt-4' },
						{ name: 'Anthropic Claude', value: 'anthropic/claude-3-sonnet' },
						{ name: 'Google Gemini', value: 'google/gemini-pro' },
					];
				}
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('fusionApi');
		const baseUrl = (credentials.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';

		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex) as {
			temperature?: number;
			maxTokens?: number;
			topP?: number;
			frequencyPenalty?: number;
			presencePenalty?: number;
		};

		return {
			response: {
				provider: 'fusion',
				kind: 'chat',
				baseUrl: `${baseUrl}/api/chat`,
				headers: {
					Authorization: `ApiKey ${credentials.apiKey}`,
					'Content-Type': 'application/json',
				},
				config: {
					model,
					temperature: options.temperature ?? 0.3,
					max_tokens: options.maxTokens ?? 1024,
					top_p: options.topP ?? 1,
					frequency_penalty: options.frequencyPenalty ?? 0,
					presence_penalty: options.presencePenalty ?? 0,
				},
				requestTransform: {
					body: (data: any) => {
						if (data.messages && Array.isArray(data.messages)) {
							// Transform messages[] array to single prompt string for Fusion API
							const prompt = data.messages.map((msg: any) => msg.content).join('\n');
							return {
								prompt,
								provider: data.model?.includes('/') ? data.model.split('/')[0] : 'neuroswitch',
								model: data.model || model,
								temperature: data.temperature ?? options.temperature ?? 0.3,
								max_tokens: data.max_tokens ?? options.maxTokens ?? 1024,
								top_p: data.top_p ?? options.topP ?? 1,
								frequency_penalty: data.frequency_penalty ?? options.frequencyPenalty ?? 0,
								presence_penalty: data.presence_penalty ?? options.presencePenalty ?? 0,
							};
						}
						return data;
					},
				},
			},
		};
	}
}