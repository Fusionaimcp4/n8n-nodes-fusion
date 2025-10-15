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
    bindTools(tools) {
        this._boundTools = tools;
        return this;
    }
    constructor(args) {
        super({});
        this.supportsToolCalling = true;
        this.model = args.model;
        this.options = args.options;
        this.apiKey = args.apiKey;
        this.baseUrl = args.baseUrl;
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
        // Format tools for the request
        let formattedTools;
        if (this._boundTools?.length) {
            formattedTools = this._boundTools.map((tool) => {
                let parameters = {
                    type: 'object',
                    properties: {},
                    required: []
                };
                if (tool.schema && typeof tool.schema === 'object') {
                    try {
                        const zodToJsonSchema = require('zod-to-json-schema');
                        parameters = zodToJsonSchema.zodToJsonSchema(tool.schema);
                    }
                    catch (error) {
                        // Fallback schema extraction
                        if (tool.schema._def && tool.schema._def.shape) {
                            const shape = tool.schema._def.shape();
                            const properties = {};
                            const required = [];
                            Object.keys(shape).forEach((key) => {
                                const field = shape[key];
                                if (field && field._def) {
                                    let type = 'string';
                                    if (field._def.typeName === 'ZodString')
                                        type = 'string';
                                    else if (field._def.typeName === 'ZodNumber')
                                        type = 'number';
                                    else if (field._def.typeName === 'ZodBoolean')
                                        type = 'boolean';
                                    properties[key] = {
                                        type,
                                        description: field.description || field._def.description || ''
                                    };
                                    if (!field.isOptional || !field.isOptional()) {
                                        required.push(key);
                                    }
                                }
                            });
                            parameters = { type: 'object', properties, required };
                        }
                    }
                }
                return {
                    type: 'function',
                    function: {
                        name: tool.name || 'unknown_tool',
                        description: tool.description || 'A tool function',
                        parameters
                    }
                };
            });
        }
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
        if (formattedTools?.length) {
            body.tools = formattedTools;
            body.enable_tools = true;
        }
        console.log('[FusionChatModel] Initial request with tools:', formattedTools?.length || 0);
        // Make initial API call
        let res;
        try {
            res = await (0, node_fetch_1.default)(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `ApiKey ${this.apiKey}`,
                },
                body: JSON.stringify(body),
            });
        }
        catch (error) {
            throw new Error(`Fusion API request failed: ${error.message}`);
        }
        if (!res.ok) {
            const errorText = await res.text().catch(() => 'Unknown error');
            throw new Error(`Fusion API error: ${res.status} ${res.statusText} - ${errorText}`);
        }
        let data = (await res.json());
        console.log('[FusionChatModel] Initial API response:', JSON.stringify(data, null, 2));
        // Use response_structured if available, fallback to response
        let text = data?.response_structured?.text ?? data?.response ?? '';
        let toolCalls = data?.response_structured?.tool_calls ?? [];
        console.log('[FusionChatModel] Extracted text:', text);
        console.log('[FusionChatModel] Extracted tool_calls:', JSON.stringify(toolCalls, null, 2));
        // Tool execution loop
        let maxIterations = 5; // Prevent infinite loops
        let iteration = 0;
        while (toolCalls.length > 0 && this._boundTools && iteration < maxIterations) {
            iteration++;
            console.log(`[FusionChatModel] Tool execution iteration ${iteration}, ${toolCalls.length} tool calls`);
            // Execute each tool call
            const toolResults = [];
            for (const toolCall of toolCalls) {
                const toolName = toolCall.name || toolCall.function?.name;
                const toolInput = toolCall.input || toolCall.function?.arguments || toolCall.arguments || {};
                const toolCallId = toolCall.id || `call_${Date.now()}`;
                console.log(`[FusionChatModel] Executing tool: ${toolName} with input:`, toolInput);
                // Find the matching tool
                const tool = this._boundTools.find((t) => t.name === toolName);
                if (tool && typeof tool.invoke === 'function') {
                    try {
                        // Execute the tool
                        const result = await tool.invoke(toolInput);
                        console.log(`[FusionChatModel] Tool ${toolName} result:`, result);
                        toolResults.push({
                            role: 'tool',
                            tool_call_id: toolCallId,
                            name: toolName,
                            content: typeof result === 'string' ? result : JSON.stringify(result)
                        });
                    }
                    catch (error) {
                        console.error(`[FusionChatModel] Tool ${toolName} execution error:`, error.message);
                        toolResults.push({
                            role: 'tool',
                            tool_call_id: toolCallId,
                            name: toolName,
                            content: `Error: ${error.message}`
                        });
                    }
                }
                else {
                    console.error(`[FusionChatModel] Tool ${toolName} not found or not invokable`);
                    toolResults.push({
                        role: 'tool',
                        tool_call_id: toolCallId,
                        name: toolName,
                        content: `Error: Tool ${toolName} not found`
                    });
                }
            }
            // Send tool results back to the LLM
            const followUpBody = {
                prompt: `Tool results: ${JSON.stringify(toolResults)}`,
                provider: mappedProvider,
                temperature: this.options?.temperature ?? 0.3,
                max_tokens: this.options?.maxTokens ?? 1024,
            };
            if (provider !== 'neuroswitch' && modelId) {
                followUpBody.model = modelId;
            }
            if (formattedTools?.length) {
                followUpBody.tools = formattedTools;
                followUpBody.enable_tools = true;
            }
            console.log('[FusionChatModel] Sending tool results back to LLM');
            try {
                res = await (0, node_fetch_1.default)(`${this.baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `ApiKey ${this.apiKey}`,
                    },
                    body: JSON.stringify(followUpBody),
                });
                if (!res.ok) {
                    const errorText = await res.text().catch(() => 'Unknown error');
                    throw new Error(`Fusion API error: ${res.status} ${res.statusText} - ${errorText}`);
                }
                data = (await res.json());
                text = data?.response_structured?.text ?? data?.response ?? '';
                toolCalls = data?.response_structured?.tool_calls ?? [];
                console.log('[FusionChatModel] LLM response after tool execution:', text);
            }
            catch (error) {
                console.error('[FusionChatModel] Error sending tool results:', error.message);
                break;
            }
        }
        if (iteration >= maxIterations) {
            console.warn('[FusionChatModel] Max tool execution iterations reached');
        }
        // Return final response
        const message = new messages_1.AIMessage({
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
        const generation = {
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
        const fusionModel = new FusionLangChainChat({ model, options, apiKey, baseUrl });
        return { response: fusionModel };
    }
}
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map