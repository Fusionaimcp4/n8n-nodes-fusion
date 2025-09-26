"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionChatModel = void 0;
const messages_1 = require("@langchain/core/messages");
const chat_models_1 = require("@langchain/core/language_models/chat_models");
/**
 * Fusion LangChain chat wrapper with tool calling support
 */
class FusionLangChainChat extends chat_models_1.BaseChatModel {
    constructor(opts) {
        super({});
        this.apiKey = opts.apiKey;
        this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
        this.provider = opts.provider || 'neuroswitch';
        this.temperature = opts.temperature ?? 0.3;
        this.maxTokens = opts.maxTokens ?? 1024;
    }
    _llmType() {
        return 'fusion';
    }
    /** Convert LC messages -> plain prompt (simple join) */
    messagesToPrompt(messages) {
        const pick = (m) => {
            const c = m?.content;
            if (typeof c === 'string')
                return c;
            if (Array.isArray(c)) {
                return c
                    .map((p) => typeof p?.text === 'string' ? p.text : '')
                    .join('\n');
            }
            return String(c ?? '');
        };
        return messages.map(pick).filter(Boolean).join('\n');
    }
    /** Core generation for LangChain with tool calling support */
    async _generate(messages, _options, _runManager) {
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
            throw new Error(`Fusion API error: ${res.status} - ${await res.text()}`);
        }
        const data = (await res.json());
        const text = data?.response?.text ?? data?.text ?? '';
        // Construct AIMessage with tool calling support
        const aiMsg = new messages_1.AIMessage({
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
        const generation = {
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
        this.methods = {
            loadOptions: {
                async getModels() {
                    try {
                        const credentials = await this.getCredentials('fusionApi');
                        const baseUrl = (credentials.baseUrl ||
                            'https://api.mcp4.ai').replace(/\/+$/, '');
                        const response = await this.helpers.httpRequest({
                            method: 'GET',
                            url: `${baseUrl}/api/models`,
                            headers: {
                                Authorization: `ApiKey ${credentials.apiKey}`,
                                'Content-Type': 'application/json',
                            },
                        });
                        const models = (response.data || response || []);
                        return models.map((m) => ({
                            name: `${m.name || m.id_string}`,
                            value: m.id_string || m.id,
                        }));
                    }
                    catch {
                        return [{ name: 'NeuroSwitch', value: 'neuroswitch' }];
                    }
                },
            },
        };
    }
    async supplyData(itemIndex) {
        const credentials = await this.getCredentials('fusionApi');
        const baseUrl = credentials.baseUrl || 'https://api.mcp4.ai';
        const provider = this.getNodeParameter('model', itemIndex) ||
            'neuroswitch';
        const temperature = this.getNodeParameter('temperature', itemIndex) ?? 0.3;
        const maxTokens = this.getNodeParameter('maxTokens', itemIndex) ?? 1024;
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
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map