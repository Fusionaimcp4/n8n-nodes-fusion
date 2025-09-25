import {
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	NodeConnectionType,
} from 'n8n-workflow';

export class FusionChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fusion Chat Model',
		name: 'fusionChatModel',
		icon: 'file:fusion.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Language Model',
		description: 'Chat Model for Fusion AI (with tool-calling support)',
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
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: 'neuroswitch',
				description: 'Model to use for the chat completion',
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions) {
				try {
					const credentials = await this.getCredentials('fusionApi');
					const baseUrl =
						(credentials.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';

					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${baseUrl}/api/models`,
						headers: {
							Authorization: `ApiKey ${credentials.apiKey}`,
							'Content-Type': 'application/json',
						},
					});

					const models = (response.data || response || []) as any[];
					return models.map((m: any) => ({
						name: m.name || m.id_string,
						value: m.id_string || m.id,
					}));
				} catch {
					return [{ name: 'NeuroSwitch', value: 'neuroswitch' }];
				}
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('fusionApi');
		const baseUrl =
			(credentials.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';

		const model = this.getNodeParameter('model', itemIndex) as string;
		const prompt = 'Hello'; // TODO: wire real user input

		// call Fusion API
		const callApi = async (messages: any[], _options?: any) => {
			const response = await fetch(`${baseUrl}/api/chat`, {
				method: 'POST',
				headers: {
					Authorization: `ApiKey ${credentials.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ prompt, provider: model || 'neuroswitch' }),
			});

			if (!response.ok) {
				throw new Error(`Fusion API error: ${response.status} - ${await response.text()}`);
			}

			const data: any = await response.json();
			const text = data.response?.text || data.text || '';

			// Build ChatGeneration-compatible object
			const generation = {
				text,
				message: {
					content: text,
					additional_kwargs: {},
					response_metadata: {
						model: data.model,
						provider: data.provider,
						tokens: data.tokens,
						cost: data.cost_charged_to_credits,
					},
				},
				generationInfo: {
					model: data.model,
					provider: data.provider,
					tokens: data.tokens,
					cost: data.cost_charged_to_credits,
				},
			};

			return {
				generations: [generation],
				llmOutput: {
					model: data.model,
					provider: data.provider,
					tokens: data.tokens,
					cost: data.cost_charged_to_credits,
				},
			};
		};

		// wrapper chat model object with tool support
		const fusionChatModel = {
			_llmType: 'chat' as const,
			modelName: model,
			supportsToolCalling: true,

			async invoke(messages: any[], options?: any) {
				return callApi(messages, options);
			},

			async generate(messages: any[], options?: any) {
				return this.invoke(messages, options);
			},

			async call(messages: any[], options?: any) {
				const result: any = await this.invoke(messages, options);
				return result.generations?.[0]?.text || '';
			},

			async stream(messages: any[], options?: any) {
				const result = await this.invoke(messages, options);
				return [result];
			},

			async bindTools(tools: any[]) {
				return {
					...this,
					async invoke(messages: any[], options?: any) {
						return callApi(messages, { ...options, tools });
					},
				};
			},
		};

		return { response: fusionChatModel };
	}
}