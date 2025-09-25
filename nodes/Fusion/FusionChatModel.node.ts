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
					return [
						{ name: 'NeuroSwitch', value: 'neuroswitch' },
						{ name: 'OpenAI GPT-4', value: 'openai/gpt-4' },
					];
				}
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('fusionApi');
		const baseUrl = (credentials.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
		const model = this.getNodeParameter('model', itemIndex) as string;

		// Simple language model that matches what n8n expects
		const languageModel = {
			// Required properties
			_llmType: 'chat' as const,
			modelName: model || 'fusion-neuroswitch',
			supportsToolCalling: true,

			// Main method n8n calls for chat models
			async generate(messages: any[], options?: any) {
				console.log('🎲 generate called with:', messages);

				// Extract user content from messages
				let userContent = '';
				if (Array.isArray(messages)) {
					userContent = messages.map(msg => {
						if (typeof msg === 'string') return msg;
						if (msg?.content) return msg.content;
						if (msg?.kwargs?.content) return msg.kwargs.content;
						return String(msg);
					}).join('\n');
				} else {
					userContent = String(messages);
				}

				console.log('📝 User content:', userContent);

				// Call Fusion API
				const response = await fetch(`${baseUrl}/api/chat`, {
					method: 'POST',
					headers: {
						Authorization: `ApiKey ${credentials.apiKey}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						prompt: userContent,
						provider: 'neuroswitch'
					}),
				});

				if (!response.ok) {
					throw new Error(`Fusion API error: ${response.status}`);
				}

				const data = await response.json() as any;
				const responseText = data.response?.text || data.text || '';

				console.log('✅ Response:', responseText);

				// Return in the format n8n expects - a ChatResult object
				return {
					generations: [{
						text: responseText,
						message: {
							content: responseText,
							additional_kwargs: {},
							response_metadata: {
								model: data.model,
								provider: data.provider,
								tokens: data.tokens,
							},
							lc: 1,
							type: "constructor",
							id: ["langchain_core", "messages", "AIMessage"]
						},
						generationInfo: {
							model: data.model,
							provider: data.provider,
						}
					}],
					llmOutput: {
						model: data.model,
						provider: data.provider,
					}
				};
			},

			// Bind tools method
			bindTools(tools: any[]) {
				return {
					...this,
					async generate(messages: any[], options?: any) {
						return languageModel.generate(messages, { ...options, tools });
					}
				};
			},
		};

		return {
			response: languageModel,
		};
	}
}