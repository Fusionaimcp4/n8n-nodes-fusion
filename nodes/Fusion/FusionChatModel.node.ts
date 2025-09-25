import {
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';

import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import { ChatGeneration, ChatResult } from '@langchain/core/outputs';

/**
 * Fusion-specific LangChain ChatModel
 */
class ChatFusion extends BaseChatModel {
	private baseUrl: string;
	private apiKey: string;
	private model: string;

	constructor(baseUrl: string, apiKey: string, model: string) {
		super({});
		this.baseUrl = baseUrl;
		this.apiKey = apiKey;
		this.model = model;
	}

	_llmType(): string {
		return 'fusion';
	}

	/** Core: transform messages -> ChatResult */
	async _generate(messages: any[], _options: any): Promise<ChatResult> {
		const prompt = messages.map((m: any) => m.content).join('\n');

		const response = await fetch(`${this.baseUrl}/api/chat`, {
			method: 'POST',
			headers: {
				Authorization: `ApiKey ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				prompt,
				provider: 'neuroswitch',
				model: this.model,
			}),
		});

		if (!response.ok) {
			throw new Error(`Fusion API error: ${response.status} - ${await response.text()}`);
		}

		const data = await response.json();
		const text = data.response?.text || data.text || '';

		const aiMessage = new AIMessage({ content: text });
		const generation = new ChatGeneration({ text, message: aiMessage });
		return new ChatResult({ generations: [generation] });
	}
}

/**
 * n8n Node wrapper
 */
export class FusionChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fusion Chat Model',
		name: 'fusionChatModel',
		icon: 'file:fusion.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Language Model',
		description: 'Chat Model for Fusion AI',
		defaults: {
			name: 'Fusion Chat Model',
		},
		inputs: [],
		outputs: ['aiLanguageModel'],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'fusionApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
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
				type: 'string',
				default: 'neuroswitch',
				description: 'Fusion model identifier',
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
		const baseUrl = (credentials.baseUrl as string)?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
		const model = this.getNodeParameter('model', itemIndex) as string;

		const fusionChatModel = new ChatFusion(baseUrl, credentials.apiKey as string, model);
		return { response: fusionChatModel };
	}
}
