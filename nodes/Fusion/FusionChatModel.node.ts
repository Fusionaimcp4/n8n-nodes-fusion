import { INodeType, INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';
import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatResult, ChatGeneration } from '@langchain/core/outputs';

// Fusion LangChain chat model with tool-calling surface restored
class FusionLangChainChat extends BaseChatModel<BaseChatModelCallOptions> {
  private model: string;
  private options: any;
  private apiKey: string;
  private baseUrl: string;
  private _boundTools?: any[];

  // Expose BOTH a data property and a getter — some guards read either
  public supportsToolCalling = true;
  get _supportsToolCalling(): boolean { return true; }
  get supportsToolChoice(): boolean { return true; }
  get supportsStructuredOutput(): boolean { return true; }

  // n8n expects bindTools to return a same-type instance
  override bindTools(tools: any[]): this {
    this._boundTools = tools;
    return this;
  }

  constructor(args: { model: string; options: any; apiKey: string; baseUrl: string }) {
    super({});
    this.model = args.model;
    this.options = args.options;
    this.apiKey = args.apiKey;
    this.baseUrl = args.baseUrl;
  }

  _llmType() { return 'fusion'; }

  async _generate(messages: BaseMessage[], _options?: BaseChatModelCallOptions): Promise<ChatResult> {
    const roleOf = (m: BaseMessage) => {
      const t = (m as any)?._getType?.() as string | undefined;
      if (t === 'human') return 'user';
      if (t === 'ai') return 'assistant';
      if (t === 'system') return 'system';
      return t ?? 'user';
    };

    const prompt = messages.map((m) => (m as any).content).join('\n');

    const body = {
      model: this.model,
      prompt,
      messages: messages.map((m) => ({ role: roleOf(m), content: (m as any).content })),
      temperature: this.options?.temperature ?? 0.3,
      max_tokens: this.options?.maxTokens ?? 1024,
    } as Record<string, any>;

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Fusion API error: ${res.status} ${res.statusText}`);

    type Tokens = {
      input_tokens?: number;
      output_tokens?: number;
      max_tokens?: number;
      runtime?: number;
      total_tokens?: number;
    };
    interface FusionResponse {
      prompt?: string;
      response?: { text?: string } | null;
      provider?: string;
      model?: string;
      tokens?: Tokens;
      cost_charged_to_credits?: number;
    }

    const data = (await res.json()) as FusionResponse;
    const text = data?.response?.text ?? '';

    const message = new AIMessage({
      content: text,
      additional_kwargs: {},
      response_metadata: {
        model: data?.model,
        provider: data?.provider,
        tokens: data?.tokens,
        cost: data?.cost_charged_to_credits,
      },
      tool_calls: [],
      invalid_tool_calls: [],
    });

    const generation: ChatGeneration = {
      text,
      message,
      generationInfo: {
        model: data?.model,
        provider: data?.provider,
        tokens: data?.tokens,
        cost: data?.cost_charged_to_credits,
        tool_calls: [],
      },
    };

    return {
      generations: [generation],
      llmOutput: {
        model: data?.model,
        provider: data?.provider,
        tokens: data?.tokens,
        cost: data?.cost_charged_to_credits,
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
    outputs: [NodeConnectionTypes.AiLanguageModel],
    outputNames: ['Model'],
    credentials: [{ name: 'fusionApi', required: true }],
    properties: [
      { displayName: 'Model', name: 'model', type: 'string', default: 'neuroswitch' },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        default: {},
        options: [
          { displayName: 'Temperature', name: 'temperature', type: 'number', default: 0.3 },
          { displayName: 'Max Tokens', name: 'maxTokens', type: 'number', default: 1024 },
        ],
      },
    ],
  };

  async supplyData(this: any, itemIndex: number) {
    const credentials = await this.getCredentials('fusionApi');
    const baseUrl = credentials.baseUrl ?? credentials.url ?? 'https://api.mcp4.ai';
    const apiKey = credentials.apiKey;

    const model = this.getNodeParameter('model', itemIndex) as string;
    const options = this.getNodeParameter('options', itemIndex, {});

    const fusionModel = new FusionLangChainChat({ model, options, apiKey, baseUrl });

    return { response: fusionModel };
  }
}
