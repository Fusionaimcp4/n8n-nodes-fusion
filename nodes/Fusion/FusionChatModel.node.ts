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
  private timeout: number;
  private maxRetries: number;

  public supportsToolCalling = true;
  get _supportsToolCalling(): boolean { return true; }
  get supportsToolChoice(): boolean { return true; }
  get supportsStructuredOutput(): boolean { return true; }

  // Tool binding handled by n8n's AI Agent
  override bindTools(tools: any[]): this {
    // Convert LangChain tools to OpenAI format
    // Preserve exact tool names from n8n - these are the source of truth for tool matching
    console.log(`[FusionChatModel] bindTools called with ${tools.length} tools`);
    this._boundTools = tools.map(tool => {
      console.log(`[FusionChatModel] Registering tool: "${tool.name}"`);
      // Get schema from tool
      const schema = tool.schema?._def;
      
      // Convert Zod schema to JSON Schema
      const properties: Record<string, any> = {};
      const required: string[] = [];

      if (schema?.shape) {
        Object.entries(schema.shape()).forEach(([key, field]: [string, any]) => {
          const fieldDef = field?._def;
          if (fieldDef) {
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
      }

      return {
        type: 'function',
        function: {
          name: tool.name, // Preserve exact tool name from n8n - no transformation
          description: tool.description,
          parameters: {
            type: 'object',
            properties,
            required
          }
        }
      };
    });
    console.log(`[FusionChatModel] Bound tools registered: ${this._boundTools.map(t => t.function.name).join(', ')}`);
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
      console.log(`[FusionChatModel] Sending ${this._boundTools.length} tools to Fusion: ${this._boundTools.map(t => t.function.name).join(', ')}`);
    } else {
      console.log(`[FusionChatModel] Not sending tools - boundTools: ${this._boundTools?.length || 0}, hasToolResults: ${hasToolResults}`);
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
    
    // Convert Fusion format { id, name, args } to OpenAI-canonical format for n8n ToolsAgent V2
    // OpenAI format: { id, type: 'function', function: { name, arguments: JSON.stringify(args) } }
    // CRITICAL: Use exact tool name from bindTools() to ensure n8n can match tools by strict name equality
    const convertedToolCalls = rawToolCalls.map((tc: any) => {
      // Look up the exact tool name from _boundTools to ensure perfect match with n8n's registry
      // n8n matches tools strictly by name equality, so we must use the exact name from bindTools()
      let toolName = tc.name;
      
      if (this._boundTools && this._boundTools.length > 0) {
        // Try exact match first
        let boundTool = this._boundTools.find(t => t.function.name === tc.name);
        
        // If no exact match, try case-insensitive match (defensive)
        if (!boundTool) {
          boundTool = this._boundTools.find(t => 
            t.function.name.toLowerCase() === tc.name.toLowerCase()
          );
        }
        
        if (boundTool) {
          toolName = boundTool.function.name; // Use exact name from bindTools() - this is the source of truth
          console.log(`[FusionChatModel] Tool name matched: Fusion returned "${tc.name}", using registered name "${toolName}"`);
        } else {
          console.warn(`[FusionChatModel] Tool name not found in bound tools: "${tc.name}". Available tools: ${this._boundTools.map(t => t.function.name).join(', ')}`);
        }
      } else {
        console.warn(`[FusionChatModel] No bound tools available, using Fusion tool name: "${tc.name}"`);
      }
      
      // Ensure args is always an object (not string) for schema validation
      const argsObj = typeof tc.args === 'string' ? JSON.parse(tc.args) : (tc.args ?? {});
      
      return {
        id: tc.id,
        type: 'function',
        name: toolName, // Top-level name for n8n ToolsAgent V2 compatibility
        function: {
          name: toolName, // Exact name from bindTools() ensures n8n can match by name equality
          arguments: JSON.stringify(argsObj) // OpenAI format: JSON string
        },
        // Also add args as object for n8n ToolsAgent V2 compatibility (if it needs direct access)
        args: argsObj
      };
    });
    
    console.log('[FusionChatModel] Tool calls for LangChain (OpenAI-canonical):', JSON.stringify(convertedToolCalls, null, 2));

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

    // Diagnostic logging: Check what LangChain actually stored
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log('[FusionChatModel] AIMessage.tool_calls after creation:', JSON.stringify(message.tool_calls, null, 2));
      const firstTc = message.tool_calls[0] as any;
      console.log('[FusionChatModel] First tool call properties:', {
        id: firstTc?.id,
        name: firstTc?.name,
        type: firstTc?.type,
        'function': firstTc?.function,
        'function.name': firstTc?.function?.name,
        'function.arguments': firstTc?.function?.arguments,
        'allKeys': Object.keys(firstTc || {})
      });
      
      // CRITICAL FIX: Ensure tool calls have accessible name and args properties for n8n
      // LangChain might not preserve top-level 'name' or 'args', so we need to ensure they're accessible
      // n8n ToolsAgent V2 looks for tool_call.name and tool_call.args for schema validation
      message.tool_calls = message.tool_calls.map((tc: any) => {
        const fixed: any = { ...tc };
        
        // Ensure name exists at top level
        if (!fixed.name && fixed.function?.name) {
          fixed.name = fixed.function.name;
        }
        
        // Ensure args exists as object for n8n schema validation
        // n8n ToolsAgent V2 needs args as an object (not just function.arguments as JSON string)
        if (!fixed.args && fixed.function?.arguments) {
          try {
            fixed.args = typeof fixed.function.arguments === 'string' 
              ? JSON.parse(fixed.function.arguments) 
              : fixed.function.arguments;
          } catch (e) {
            console.warn(`[FusionChatModel] Failed to parse function.arguments: ${fixed.function.arguments}`, e);
            fixed.args = {};
          }
        } else if (!fixed.args) {
          fixed.args = {};
        }
        
        return fixed;
      });
      
      console.log('[FusionChatModel] Tool calls after name fix:', JSON.stringify(message.tool_calls, null, 2));
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