import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

export class FusionChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fusion Chat Model',
		name: 'fusionChatModel',
		icon: 'file:fusion.svg',
		group: ['ai'],
		version: 1,
		subtitle: 'Language Model Fusion',
		description: 'Use Fusion as a chat LLM',
		defaults: { 
			name: 'Fusion Chat Model' 
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
			categories: ['AI', 'Language Models'] 
		},
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getModels' },
				default: 'neuroswitch',
				description: 'The AI model to use for chat completions',
			},
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
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions) {
				try {
					const cred = await this.getCredentials('fusionApi');
					const baseUrl = (cred.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
					
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${baseUrl}/api/models`,
						headers: { 
							Authorization: `ApiKey ${cred.apiKey}`,
							'Content-Type': 'application/json',
						},
					});
					
					const models = (response.data || response || []) as any[];
					return models.map((m: any) => ({
						name: m.name || m.id_string || 'Unknown Model',
						value: m.id_string || m.id || 'unknown',
					}));
				} catch (error: any) {
					// Log the error for debugging but provide fallback models
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items: INodeExecutionData[] = [];
		
		for (let i = 0; i < this.getInputData().length || i === 0; i++) {
			const cred = await this.getCredentials('fusionApi');
			const baseUrl = (cred.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';

			const model = this.getNodeParameter('model', i) as string;
			const temperature = this.getNodeParameter('temperature', i) as number;
			const maxTokens = this.getNodeParameter('maxTokens', i) as number;
			const topP = this.getNodeParameter('topP', i) as number;
			const frequencyPenalty = this.getNodeParameter('frequencyPenalty', i) as number;
			const presencePenalty = this.getNodeParameter('presencePenalty', i) as number;

			items.push({
				json: {},
				pairedItem: { item: i },
				context: {
					ai: {
						languageModel: {
							provider: 'fusion',
							baseUrl: `${baseUrl}/api/chat`,
							headers: {
								'Authorization': `ApiKey ${cred.apiKey}`,
								'Content-Type': 'application/json',
							},
							config: {
								model,
								temperature,
								max_tokens: maxTokens,
								top_p: topP,
								frequency_penalty: frequencyPenalty,
								presence_penalty: presencePenalty,
							},
						},
					},
				},
			});
		}
		
		return [items];
	}
}
