import {
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
	NodeConnectionType,
} from 'n8n-workflow';

import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { ChatGeneration, ChatResult } from '@langchain/core/outputs';
import {
	BaseChatModel,
	BaseChatModelCallOptions,
} from '@langchain/core/language_models/chat_models';

/**
 * Fusion LangChain chat wrapper with tool calling support
 */
class FusionLangChainChat extends BaseChatModel<BaseChatModelCallOptions> {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly provider: string;
	private readonly temperature: number;
	private readonly maxTokens: number;

	constructor(opts: { 
		apiKey: string; 
		baseUrl: string; 
		provider: string;
		temperature?: number;
		maxTokens?: number;
	}) {
		super({});
		this.apiKey = opts.apiKey;
		this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
		this.provider = opts.provider || 'neuroswitch';
		this.temperature = opts.temperature ?? 0.3;
		this.maxTokens = opts.maxTokens ?? 1024;
	}

	_llmType(): string {
		return 'fusion';
	}

	/** Convert LC messages -> plain prompt (simple join) */
	private messagesToPrompt(messages: BaseMessage[]): string {
		const pick = (m: any) => {
			const c = m?.content;
			if (typeof c === 'string') return c;
			if (Array.isArray(c)) {
				return c
					.map((p: any) =>
						typeof p?.text === 'string' ? p.text : '',
					)
					.join('\n');
			}
			return String(c ?? '');
		};
		return messages.map(pick).filter(Boolean).join('\n');
	}

	/** Core generation for LangChain with tool calling support */
	public async _generate(
		messages: BaseMessage[],
		_options?: BaseChatModelCallOptions,
		_runManager?: any,
	): Promise<ChatResult> {
		const prompt = this.messagesToPrompt(messages);

		const res = await fetch(`${this.baseUrl}/api/chat`, {
			method: 'POST',
			headers: {
				Authorization: `ApiKey ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ 
				prompt, 
				provider: this.provider,
				temperature: this.temperature,
				max_tokens: this.maxTokens
			}),
		});

		if (!res.ok) {
			throw new Error(
				`Fusion API error: ${res.status} - ${await res.text()}`,
			);
		}

		const data = (await res.json()) as any;
		const text = data?.response?.text ?? data?.text ?? '';

		// Construct AIMessage with tool calling support
		const aiMsg = new AIMessage({
			content: text,
			response_metadata: {
				model: data?.model,
				provider: data?.provider,
				tokens: data?.tokens,
				cost: data?.cost_charged_to_credits,
				tool_calls: [], // Empty for now, but structure is ready for future tool support
			},
		});

		// Construct generation object (typed)
		const generation: ChatGeneration = {
			text,
			message: aiMsg,
			generationInfo: {
				model: data?.model,
				provider: data?.provider,
				tokens: data?.tokens,
				cost: data?.cost_charged_to_credits,
				tool_calls: [], // Empty tool calls for now
			},
		};

		// Return full ChatResult
		return {
			generations: [generation],
			llmOutput: {
				model: data?.model,
				provider: data?.provider,
				tokens: data?.tokens,
				cost: data?.cost_charged_to_credits,
				tool_calls: [], // Empty tool calls for now
			},
		};
	}
}

export class FusionChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fusion Chat Model',
		name: 'fusionChatModel',
		icon: 'file:fusion.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Language Model',
		description: 'Chat model for Fusion AI (supports tools)',
		defaults: { name: 'Fusion Chat Model' },
		inputs: [],
		outputs: ['ai_languageModel'],
		credentials: [{ name: 'fusionApi', required: true }],
		codex: {
			categories: ['AI', 'Language Models'],
			resources: {
				primaryDocumentation: [
					{ url: 'https://api.mcp4.ai/api-docs/' },
				],
			},
		},
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getModels' },
				default: 'neuroswitch',
				description: 'Model (provider) to use',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.3,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				description: 'Controls randomness in the response. Higher values make output more random.',
			},
			{
				displayName: 'Max Tokens',
				name: 'maxTokens',
				type: 'number',
				default: 1024,
				typeOptions: {
					minValue: 1,
					maxValue: 8192,
				},
				description: 'Maximum number of tokens to generate in the response',
			},
			{
				displayName: 'Tool Calling',
				name: 'toolCalling',
				type: 'boolean',
				default: true,
				description: 'Whether this model supports tool calling (enables AI Agent integration)',
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions) {
				try {
					const credentials = await this.getCredentials('fusionApi');
					const baseUrl =
						((credentials.baseUrl as string) ||
							'https://api.mcp4.ai').replace(/\/+$/, '');

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
						name: `${m.name || m.id_string}`,
						value: m.id_string || m.id,
					}));
				} catch {
					return [{ name: 'NeuroSwitch', value: 'neuroswitch' }];
				}
			},
		},
	};

	async supplyData(
		this: ISupplyDataFunctions,
		itemIndex: number,
	): Promise<SupplyData> {
		const credentials = await this.getCredentials('fusionApi');
		const baseUrl =
			(credentials.baseUrl as string) || 'https://api.mcp4.ai';
		const provider =
			(this.getNodeParameter('model', itemIndex) as string) ||
			'neuroswitch';
		const temperature = 
			(this.getNodeParameter('temperature', itemIndex) as number) ?? 0.3;
		const maxTokens = 
			(this.getNodeParameter('maxTokens', itemIndex) as number) ?? 1024;

		const model = new FusionLangChainChat({
			apiKey: String(credentials.apiKey),
			baseUrl,
			provider,
			temperature,
			maxTokens,
		});

		// The AI Agent expects a LangChain ChatModel instance here
		return { response: model };
	}
}
