import { INodeType, INodeTypeDescription, NodeConnectionTypes, ILoadOptionsFunctions } from 'n8n-workflow';
import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatResult, ChatGeneration } from '@langchain/core/outputs';
import fetch from 'node-fetch';

// Fusion LangChain chat model with tool-calling surface restored
class FusionLangChainChat extends BaseChatModel<BaseChatModelCallOptions> {
  private model: string;
  private options: any;
  private apiKey: string;
  private baseUrl: string;
  private _boundTools?: any[];

  public supportsToolCalling = true;
  get _supportsToolCalling(): boolean { return true; }
  get supportsToolChoice(): boolean { return true; }
  get supportsStructuredOutput(): boolean { return true; }

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

    // Split provider / model from dropdown
    let provider = 'neuroswitch';
    let modelId: string | undefined = undefined;

    if (this.model && this.model.includes(':')) {
      [provider, modelId] = this.model.split(':');
      // Remove provider prefix from modelId if it exists (e.g., "openai/gpt-4o-mini" -> "gpt-4o-mini")
      if (modelId && modelId.includes('/')) {
        modelId = modelId.split('/')[1];
      }
    } else if (this.model) {
      provider = this.model; // Handle legacy "neuroswitch" or other single values
    }

    // Map provider names to match backend API expectations
    const providerMap: Record<string, string> = {
      'anthropic': 'claude',  // Backend expects "claude" not "anthropic"
    };
    const mappedProvider = providerMap[provider] || provider;

    const body: Record<string, any> = {
      prompt,
      provider: mappedProvider,
      temperature: this.options?.temperature ?? 0.3,
      max_tokens: this.options?.maxTokens ?? 1024,
    };

    if (provider !== 'neuroswitch' && modelId) {
      body.model = modelId;
    }

    if (this._boundTools?.length) {
      // Convert LangChain tools to OpenAI format
      const formattedTools = this._boundTools.map((tool: any) => {
        console.log('[DEBUG Tool] keys:', Object.keys(tool).slice(0, 30), 'schema?', !!tool.schema, 'name:', tool.name);
        console.log('[DEBUG Tool] schema type:', typeof tool.schema, 'schema value:', tool.schema);
        
        // If tool has a toJSON method, use it
        if (typeof tool.toJSON === 'function') {
          return tool.toJSON();
        }
        
        // If tool has Zod schema, convert it to JSON Schema
        if (tool.schema && typeof tool.schema === 'object' && tool.schema._def) {
          // Convert Zod schema to JSON Schema
          const jsonSchema: any = {
            type: 'object',
            properties: {},
            required: []
          };
          
          // Try to extract properties from Zod schema
          if (tool.schema._def.shape) {
            const shape = tool.schema._def.shape();
            Object.keys(shape).forEach(key => {
              const field = shape[key];
              if (field._def) {
                jsonSchema.properties[key] = {
                  type: field._def.typeName === 'ZodString' ? 'string' : 
                        field._def.typeName === 'ZodNumber' ? 'number' :
                        field._def.typeName === 'ZodBoolean' ? 'boolean' : 'string',
                  description: field.description || ''
                };
                if (!field.isOptional()) {
                  jsonSchema.required.push(key);
                }
              }
            });
          }
          
          return {
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description || '',
              parameters: jsonSchema,
            },
          };
        }
        
        // If tool has plain schema property, use it to build OpenAI format
        if (tool.schema && typeof tool.schema === 'object') {
          return {
            type: 'function',
            function: {
              name: tool.name || tool.schema.name,
              description: tool.description || tool.schema.description || '',
              parameters: tool.schema,
            },
          };
        }
        
        // Fallback: return as-is (shouldn't happen with proper LangChain tools)
        return tool;
      });
      body.tools = formattedTools;
      body.enable_tools = true;
    }

    // DEBUG: Log the request being sent
    console.log('[FusionChatModel] Provider mapping:', provider, '->', mappedProvider);
    console.log('[FusionChatModel] Bound tools:', this._boundTools ? `${this._boundTools.length} tools` : 'none');
    if (body.tools?.length) {
      console.log('[FusionChatModel] Formatted tools being sent:', JSON.stringify(body.tools, null, 2));
    }
    console.log('[FusionChatModel] Full request body:', JSON.stringify(body, null, 2));

    let res: any;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      console.error('Fusion API request failed:', error.message);
      throw new Error(`Fusion API request failed: ${error.message}`);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error(`Fusion API error: ${res.status} ${res.statusText}`, errorText);
      throw new Error(`Fusion API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    type Tokens = {
      input_tokens?: number;
      output_tokens?: number;
      max_tokens?: number;
      runtime?: number;
      total_tokens?: number;
    };
    interface FusionResponse {
      prompt?: string;
      response?: { text?: string; tool_calls?: any[]; invalid_tool_calls?: any[] } | null;
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
      tool_calls: data?.response?.tool_calls ?? [],
      invalid_tool_calls: data?.response?.invalid_tool_calls ?? [],
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
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getModels',
        },
        default: 'neuroswitch',
        description: 'Select which model/provider to use',
      },
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

  methods = {
    loadOptions: {
      async getModels(this: ILoadOptionsFunctions) {
        try {
          const credentials = await this.getCredentials('fusionApi');
          const baseUrl = credentials.baseUrl ?? 'https://api.mcp4.ai';

          const res = await this.helpers.httpRequest({
            method: 'GET',
            url: `${baseUrl}/api/models`,
            headers: { Authorization: `ApiKey ${credentials.apiKey}` },
          });

          const models = (res.data || res) as any[];
          const modelOptions = models
            .filter((m: any) => m.is_active)
            .map((m: any) => ({
              name: `${m.provider}: ${m.name}`,
              value: `${m.provider}:${m.id_string}`,  // e.g. "openai:gpt-4o-mini"
            }));

          // Always include NeuroSwitch as the first option
          modelOptions.unshift({
            name: 'NeuroSwitch (auto routing)',
            value: 'neuroswitch'
          });

          return modelOptions;
        } catch (error: any) {
          console.error('Failed to load Fusion models:', error.message);
          // Return fallback options
          return [
            { name: 'NeuroSwitch (auto routing)', value: 'neuroswitch' },
            { name: 'OpenAI: GPT-4', value: 'openai:gpt-4' },
            { name: 'Anthropic: Claude 3 Sonnet', value: 'anthropic:claude-3-sonnet' },
            { name: 'Google: Gemini Pro', value: 'google:gemini-pro' },
          ];
        }
      },
    },
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