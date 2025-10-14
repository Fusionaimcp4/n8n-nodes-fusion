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
        const roleOf = (m) => {
            const t = m?._getType?.();
            if (t === 'human')
                return 'user';
            if (t === 'ai')
                return 'assistant';
            if (t === 'system')
                return 'system';
            return t ?? 'user';
        };
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
            'google': 'gemini', // Backend expects "gemini" not "google"
        };
        const mappedProvider = providerMap[provider] || provider;
        const body = {
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
            const formattedTools = this._boundTools.map((tool) => {
                console.log('[DEBUG Tool] keys:', Object.keys(tool).slice(0, 30), 'schema?', !!tool.schema, 'name:', tool.name);
                console.log('[DEBUG Tool] schema type:', typeof tool.schema, 'schema value:', tool.schema);
                // If tool has a toJSON method, use it
                if (typeof tool.toJSON === 'function') {
                    return tool.toJSON();
                }
                // Create a simple OpenAI function format
                return {
                    type: 'function',
                    function: {
                        name: tool.name || 'unknown_tool',
                        description: tool.description || 'A tool function',
                        parameters: {
                            type: 'object',
                            properties: {},
                            required: []
                        }
                    }
                };
            });
            body.tools = formattedTools;
            body.enable_tools = true;
        }
        // DEBUG: Log the request being sent
        console.log('[FusionChatModel] Provider mapping:', provider, '->', mappedProvider);
        console.log('[FusionChatModel] Bound tools:', this._boundTools ? `${this._boundTools.length} tools` : 'none');
        console.log('[FusionChatModel] Requested provider from model:', this.model);
        console.log('[FusionChatModel] Final provider being sent:', mappedProvider);
        if (body.tools?.length) {
            console.log('[FusionChatModel] Formatted tools being sent:', JSON.stringify(body.tools, null, 2));
        }
        console.log('[FusionChatModel] Full request body:', JSON.stringify(body, null, 2));
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
            console.error('Fusion API request failed:', error.message);
            throw new Error(`Fusion API request failed: ${error.message}`);
        }
        if (!res.ok) {
            const errorText = await res.text().catch(() => 'Unknown error');
            console.error(`Fusion API error: ${res.status} ${res.statusText}`, errorText);
            throw new Error(`Fusion API error: ${res.status} ${res.statusText} - ${errorText}`);
        }
        const data = (await res.json());
        const text = data?.response?.text ?? '';
        const message = new messages_1.AIMessage({
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