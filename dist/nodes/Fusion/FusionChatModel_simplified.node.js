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
// Simplified Fusion LangChain chat model - like Azure OpenAI node
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
        // Request body
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
        console.log('[FusionChatModel] Making API request with tools:', formattedTools?.length || 0);
        // Make API call
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
        const data = (await res.json());
        console.log('[FusionChatModel] API response:', JSON.stringify(data, null, 2));
        // Use response_structured if available, fallback to response
        const text = data?.response_structured?.text ?? data?.response ?? '';
        const toolCalls = data?.response_structured?.tool_calls ?? [];
        console.log('[FusionChatModel] Extracted text:', text);
        console.log('[FusionChatModel] Extracted tool_calls:', JSON.stringify(toolCalls, null, 2));
        // Convert tool_calls to LangChain format
        const langchainToolCalls = toolCalls.map((toolCall) => ({
            id: toolCall.id,
            name: toolCall.name,
            args: toolCall.input || toolCall.arguments || {},
        }));
        // Return response - let n8n's AI Agent handle tool execution
        const message = new messages_1.AIMessage({
            content: text,
            additional_kwargs: {},
            response_metadata: {
                model: data?.model,
                provider: data?.provider,
                tokens: data?.tokens,
                cost: data?.cost_charged_to_credits,
            },
            tool_calls: langchainToolCalls,
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
                tool_calls: langchainToolCalls,
            },
        };
        return {
            generations: [generation],
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
            description: 'Fusion AI Chat Model with multi-provider support',
            defaults: {
                name: 'Fusion Chat Model',
            },
            inputs: [],
            outputs: [n8n_workflow_1.NodeConnectionTypes.AiLanguageModel],
            outputNames: ['Model'],
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
                    default: 'neuroswitch',
                    options: [
                        {
                            name: 'NeuroSwitch (Auto)',
                            value: 'neuroswitch',
                        },
                        {
                            name: 'OpenAI: GPT-4o Mini',
                            value: 'openai:gpt-4o-mini',
                        },
                        {
                            name: 'OpenAI: GPT-4o',
                            value: 'openai:gpt-4o',
                        },
                        {
                            name: 'Anthropic: Claude 3.5 Sonnet',
                            value: 'anthropic:claude-3-5-sonnet-20241022',
                        },
                        {
                            name: 'Google: Gemini 1.5 Pro',
                            value: 'google:gemini-1.5-pro',
                        },
                    ],
                    description: 'Select the AI model to use',
                },
                {
                    displayName: 'Temperature',
                    name: 'temperature',
                    type: 'number',
                    default: 0.3,
                    typeOptions: {
                        minValue: 0,
                        maxValue: 2,
                        numberStepSize: 0.1,
                    },
                    description: 'Controls randomness in the response',
                },
                {
                    displayName: 'Max Tokens',
                    name: 'maxTokens',
                    type: 'number',
                    default: 1024,
                    typeOptions: {
                        minValue: 1,
                        maxValue: 8000,
                    },
                    description: 'Maximum number of tokens to generate',
                },
            ],
        };
    }
    async supplyData(itemIndex) {
        const model = this.getNodeParameter('model', itemIndex);
        const temperature = this.getNodeParameter('temperature', itemIndex);
        const maxTokens = this.getNodeParameter('maxTokens', itemIndex);
        const credentials = await this.getCredentials('fusionApi');
        const apiKey = credentials.apiKey;
        const baseUrl = credentials.baseUrl || 'https://api.mcp4.ai';
        console.log(`[FusionChatModel] Instantiating Fusion model: ${model}`);
        const fusionModel = new FusionLangChainChat({
            model,
            options: { temperature, maxTokens },
            apiKey,
            baseUrl,
        });
        console.log(`[FusionChatModel] Fusion model initialized: ${model}`);
        return {
            response: fusionModel,
        };
    }
}
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel_simplified.node.js.map