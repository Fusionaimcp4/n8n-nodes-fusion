import { INodeType, INodeTypeDescription, NodeConnectionTypes, ILoadOptionsFunctions } from 'n8n-workflow';
import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { ChatResult, ChatGeneration } from '@langchain/core/outputs';
import fetch from 'node-fetch';

// Fusion LangChain chat model with tool-calling surface restored
class FusionLangChainChat extends BaseChatModel<BaseChatModelCallOptions> {
  private model: string;
  private options: any;
  private apiKey: string;
  private baseUrl: string;
  private _boundTools?: any[];
  private _toolAllowedKeys?: Map<string, string[]>; // Store allowed keys per tool name
  private timeout: number;
  private maxRetries: number;

  public supportsToolCalling = true;
  get _supportsToolCalling(): boolean { return true; }
  get supportsToolChoice(): boolean { return true; }
  get supportsStructuredOutput(): boolean { return true; }

  // Tool binding handled by n8n's AI Agent
  override bindTools(tools: any[]): this {
    // Initialize map to store allowed keys per tool
    this._toolAllowedKeys = new Map<string, string[]>();
    
    // Convert LangChain tools to OpenAI format
    this._boundTools = tools.map(tool => {
      // Log tool structure for debugging
      console.log(`[FusionChatModel] bindTools - Tool: ${tool.name}`, {
        hasSchema: !!tool.schema,
        hasParameters: !!tool.parameters,
        schemaType: tool.schema?.constructor?.name,
        toolKeys: Object.keys(tool || {})
      });
      
      // Get schema from tool
      const schema = tool.schema?._def;
      
      // Convert Zod schema to JSON Schema
      const properties: Record<string, any> = {};
      const required: string[] = [];
      const allowedKeys: string[] = [];

      // Try to get keys from tool.parameters first (if it's already a JSON Schema)
      if (tool.parameters?.properties && typeof tool.parameters.properties === 'object') {
        console.log(`[FusionChatModel] Using tool.parameters for ${tool.name}`);
        Object.keys(tool.parameters.properties).forEach(key => {
          allowedKeys.push(key);
          properties[key] = tool.parameters.properties[key];
          if (tool.parameters.required?.includes(key)) {
            required.push(key);
          }
        });
      } else if (schema?.shape) {
        console.log(`[FusionChatModel] Using schema.shape for ${tool.name}`);
        // Fallback to Zod schema extraction
        const shape = schema.shape();
        console.log(`[FusionChatModel] Schema shape keys for ${tool.name}:`, Object.keys(shape || {}));
        
        Object.entries(shape || {}).forEach(([key, field]: [string, any]) => {
          const fieldDef = field?._def;
          if (fieldDef) {
            allowedKeys.push(key); // Capture allowed key
            properties[key] = {
              type: fieldDef.typeName === 'ZodString' ? 'string' :
                    fieldDef.typeName === 'ZodNumber' ? 'number' :
                    fieldDef.typeName === 'ZodBoolean' ? 'boolean' : 'string',
              description: field.description || ''
            };
            
            // Add to required if not optional
            if (!field.isOptional || !field.isOptional()) {
              required.push(key);
            }
          }
        });
      } else {
        console.log(`[FusionChatModel] No schema found for ${tool.name}, tool object:`, JSON.stringify(tool, null, 2));
      }

      // Store allowed keys from the properties object we built (matches what we send to Fusion)
      // This ensures we filter based on the actual JSON Schema, not the Zod schema
      const finalAllowedKeys = Object.keys(properties);
      
      if (tool.name && finalAllowedKeys.length > 0 && this._toolAllowedKeys) {
        // Check if keys look like actual field names (not internal parameter placeholders)
        const hasValidKeys = finalAllowedKeys.some(key => {
          // Valid keys should not be generic parameter placeholders
          const isInvalid = key.match(/^parameters\d+_Value$/);
          return !isInvalid;
        });
        
        // Only store if we have valid-looking keys
        // If all keys are invalid placeholders, skip filtering for this tool
        if (hasValidKeys) {
          this._toolAllowedKeys.set(tool.name, finalAllowedKeys);
          console.log(`[FusionChatModel] Stored allowed keys for ${tool.name}:`, finalAllowedKeys);
        } else {
          console.log(`[FusionChatModel] Skipping schema filter for ${tool.name} - invalid keys:`, finalAllowedKeys);
        }
      }

      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties,
            required
          }
        }
      };
    });
    return this;
  }

  constructor(args: { model: string; options: any; apiKey: string; baseUrl: string }) {
    super({});
    this.model = args.model;
    this.options = args.options;
    this.apiKey = args.apiKey;
    this.baseUrl = args.baseUrl;
    
    // Match Azure OpenAI defaults
    this.timeout = args.options?.timeout ?? 60000; // 60 seconds
    this.maxRetries = args.options?.maxRetries ?? 2; // 2 retries
  }

  _llmType() { return 'fusion'; }

  async _generate(messages: BaseMessage[], _options?: BaseChatModelCallOptions): Promise<ChatResult> {
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
      'anthropic': 'claude',
      'google': 'gemini',
    };
    const mappedProvider = providerMap[provider.toLowerCase()] || provider;

    // Initial request body
    const body: Record<string, any> = {
      prompt,
      provider: mappedProvider,
      temperature: this.options?.temperature ?? 0.3,
      max_tokens: this.options?.maxTokens ?? 1024,
    };

    if (provider !== 'neuroswitch' && modelId) {
      body.model = modelId;
    }

    // Only include tools if this is NOT a tool result callback
    // Check if message contains tool results (like [{"type":"text","text":"15"}])
    const hasToolResults = prompt.includes('[{"type":"text","text":"') || 
                          prompt.includes('Error POSTing to endpoint');
    
    if (this._boundTools?.length && !hasToolResults) {
      body.tools = this._boundTools;
      body.enable_tools = true;
    }

    // Make API call with timeout and retry (matching LangChain behavior)
    let res: any;
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        res = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeout)
        });
        
        if (res.ok) break; // Success, exit retry loop
        
      } catch (error: any) {
        lastError = error;
        if (attempt === this.maxRetries) throw error; // Final attempt failed
        
        // Simple exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Fusion API error: ${res.status} ${res.statusText} - ${errorText}`);
    }


    const data = await res.json();
    console.log('[FusionChatModel] Raw response from Fusion backend:', JSON.stringify(data, null, 2));
    
    const text = data?.response?.text ?? '';
    const rawToolCalls = data?.response?.tool_calls ?? [];
    
    console.log('[FusionChatModel] Raw tool calls from Fusion:', JSON.stringify(rawToolCalls, null, 2));
    
    // Transform LangChain format ({ id, name, args }) to n8n's expected format
    // n8n's AI Agent needs BOTH:
    // - args: for AI Agent planner/router logic
    // - function.arguments: for tool executor
    // Filter args to only include allowed keys from tool schema
    const convertedToolCalls = rawToolCalls.map((tc: any) => {
      const rawArgs = tc.args ?? {};
      let filteredArgs = rawArgs;
      
      // Filter args to only include allowed keys from tool schema
      if (tc.name && this._toolAllowedKeys?.has(tc.name)) {
        const allowedKeys = this._toolAllowedKeys.get(tc.name)!;
        
        // Only filter if we have valid keys (not internal parameter names)
        const hasValidKeys = allowedKeys.some(key => 
          !key.startsWith('parameters') || !key.includes('_Value')
        );
        
        if (hasValidKeys && allowedKeys.length > 0) {
          filteredArgs = Object.keys(rawArgs)
            .filter(key => allowedKeys.includes(key))
            .reduce((obj: any, key) => {
              obj[key] = rawArgs[key];
              return obj;
            }, {});
          
          console.log(`[FusionChatModel] Filtered args for ${tc.name}:`, {
            original: Object.keys(rawArgs),
            allowed: allowedKeys,
            filtered: Object.keys(filteredArgs)
          });
        } else {
          // If schema extraction failed, don't filter (pass through all args)
          console.log(`[FusionChatModel] Skipping filter for ${tc.name} - invalid schema keys:`, allowedKeys);
        }
      }
      
      return {
        // n8n AI Agent needs this
        id: tc.id,
        name: tc.name,
        args: filteredArgs,
        // n8n Tool Executor needs this
        type: 'function',
        function: {
          name: tc.name,
          arguments: filteredArgs,
        },
      };
    });
    
    console.log('[FusionChatModel] Tool calls converted for n8n:', JSON.stringify(convertedToolCalls, null, 2));

    const message = new AIMessage({
      content: text,
      additional_kwargs: {},
      response_metadata: {
        model: data?.model,
        provider: data?.provider,
        tokens: data?.tokens,
        cost: data?.cost_charged_to_credits,
      },
      tool_calls: convertedToolCalls,
      invalid_tool_calls: [],
    });

    // Diagnostic logging to identify tool call structure issues
    console.log('[FusionChatModel] AIMessage created');
    console.log('[FusionChatModel] tool_calls type:', typeof message.tool_calls);
    console.log('[FusionChatModel] tool_calls instanceof Array:', Array.isArray(message.tool_calls));
    console.log('[FusionChatModel] tool_calls constructor:', message.tool_calls?.constructor?.name);
    console.log('[FusionChatModel] tool_calls length:', message.tool_calls?.length);
    
    if (message.tool_calls?.length) {
      const tc = message.tool_calls[0];
      console.log('[FusionChatModel] First tool_call:', tc);
      console.log('[FusionChatModel] tool_call constructor:', tc?.constructor?.name);
      console.log('[FusionChatModel] tool_call keys:', Object.keys(tc || {}));
      console.log('[FusionChatModel] args type:', typeof tc?.args);
      console.log('[FusionChatModel] args constructor:', tc?.args?.constructor?.name);
      console.log('[FusionChatModel] args instanceof Object:', tc?.args instanceof Object);
      console.log('[FusionChatModel] args prototype:', Object.getPrototypeOf(tc?.args));
      console.log('[FusionChatModel] args keys:', Object.keys(tc?.args || {}));
      console.log('[FusionChatModel] args JSON:', JSON.stringify(tc?.args, null, 2));
      
      // Compare with raw input
      if (convertedToolCalls?.length) {
        const rawTc = convertedToolCalls[0];
        console.log('[FusionChatModel] Raw tool_call args type:', typeof rawTc?.args);
        console.log('[FusionChatModel] Raw tool_call args constructor:', rawTc?.args?.constructor?.name);
        console.log('[FusionChatModel] Args changed after AIMessage?', tc?.args !== rawTc?.args);
      }
    }

    const generation: ChatGeneration = {
      text,
      message,
      generationInfo: {
        model: data?.model,
        provider: data?.provider,
        tokens: data?.tokens,
        cost: data?.cost_charged_to_credits,
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

    const fusionModel = new FusionLangChainChat({ 
      model, 
      options: {
        ...options,
        timeout: options.timeout ?? 60000,
        maxRetries: options.maxRetries ?? 2
      }, 
      apiKey, 
      baseUrl 
    });

    return { response: fusionModel };
  }
}