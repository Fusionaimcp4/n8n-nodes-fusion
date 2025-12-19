"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionChatModel = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const chat_models_1 = require("@langchain/core/language_models/chat_models");
const messages_1 = require("@langchain/core/messages");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Fusion LangChain chat model with tool-calling surface restored
class FusionLangChainChat extends chat_models_1.BaseChatModel {
    get _supportsToolCalling() { return true; }
    get supportsToolChoice() { return true; }
    get supportsStructuredOutput() { return true; }
    // Tool binding handled by n8n's AI Agent
    bindTools(tools) {
        // Convert LangChain tools to OpenAI format
        this._boundTools = tools.map(tool => {
            // Get schema from tool
            const schema = tool.schema?._def;
            // Convert Zod schema to JSON Schema
            const properties = {};
            const required = [];
            if (schema?.shape) {
                Object.entries(schema.shape()).forEach(([key, field]) => {
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
    constructor(args) {
        super({});
        this.supportsToolCalling = true;
        this.model = args.model;
        this.options = args.options;
        this.apiKey = args.apiKey;
        this.baseUrl = args.baseUrl;
        // Match Azure OpenAI defaults
        this.timeout = args.options?.timeout ?? 60000; // 60 seconds
        this.maxRetries = args.options?.maxRetries ?? 2; // 2 retries
    }
    _llmType() { return 'fusion'; }
    async _generate(messages, _options) {
        const prompt = messages.map((m) => m.content).join('\n');
        // Split provider / model from dropdown
        let provider = 'neuroswitch';
        let modelId = undefined;
        if (this.model && this.model.includes(':')) {
            [provider, modelId] = this.model.split(':');
            // Remove provider prefix from modelId if it exists (e.g., "openai/gpt-4o-mini" -> "gpt-4o-mini")
            if (modelId && modelId.includes('/')) {
                modelId = modelId.split('/')[1];
            }
        }
        else if (this.model) {
            provider = this.model; // Handle legacy "neuroswitch" or other single values
        }
        // Map provider names to match backend API expectations
        const providerMap = {
            'anthropic': 'claude',
            'google': 'gemini',
        };
        const mappedProvider = providerMap[provider.toLowerCase()] || provider;
        // Initial request body
        const body = {
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
        let res;
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                res = await (0, node_fetch_1.default)(`${this.baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `ApiKey ${this.apiKey}`,
                    },
                    body: JSON.stringify(body),
                    signal: AbortSignal.timeout(this.timeout)
                });
                if (res.ok)
                    break; // Success, exit retry loop
            }
            catch (error) {
                lastError = error;
                if (attempt === this.maxRetries)
                    throw error; // Final attempt failed
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
        // Fusion backend already sends the correct LangChain format
        const convertedToolCalls = rawToolCalls;
        console.log('[FusionChatModel] Tool calls for LangChain:', JSON.stringify(convertedToolCalls, null, 2));
        const message = new messages_1.AIMessage({
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
        const generation = {
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
class FusionChatModel {
    constructor() {
        this.description = {
            displayName: 'Fusion Chat Model',
            name: 'fusionChatModel',
            icon: 'file:fusion.svg',
            group: ['transform'],
            version: 1,
            subtitle: 'Language Model',
            description: 'Chat model for Fusion AI (supports tools)',
            defaults: { name: 'Fusion Chat Model' },
            inputs: [],
            outputs: [n8n_workflow_1.NodeConnectionTypes.AiLanguageModel],
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
        this.methods = {
            loadOptions: {
                async getModels() {
                    try {
                        const credentials = await this.getCredentials('fusionApi');
                        const baseUrl = credentials.baseUrl ?? 'https://api.mcp4.ai';
                        const res = await this.helpers.httpRequest({
                            method: 'GET',
                            url: `${baseUrl}/api/models`,
                            headers: { Authorization: `ApiKey ${credentials.apiKey}` },
                        });
                        const models = (res.data || res);
                        const modelOptions = models
                            .filter((m) => m.is_active)
                            .map((m) => ({
                            name: `${m.provider}: ${m.name}`,
                            value: `${m.provider}:${m.id_string}`, // e.g. "openai:gpt-4o-mini"
                        }));
                        // Always include NeuroSwitch as the first option
                        modelOptions.unshift({
                            name: 'NeuroSwitch (auto routing)',
                            value: 'neuroswitch'
                        });
                        return modelOptions;
                    }
                    catch (error) {
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
    }
    async supplyData(itemIndex) {
        const credentials = await this.getCredentials('fusionApi');
        const baseUrl = credentials.baseUrl ?? credentials.url ?? 'https://api.mcp4.ai';
        const apiKey = credentials.apiKey;
        const model = this.getNodeParameter('model', itemIndex);
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
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map