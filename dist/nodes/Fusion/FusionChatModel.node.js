"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionChatModel = void 0;
const messages_1 = require("@langchain/core/messages");
const chat_models_1 = require("@langchain/core/language_models/chat_models");
/**
 * Minimal LangChain chat wrapper for Fusion API
 */
class FusionLangChainChat extends chat_models_1.BaseChatModel {
    constructor(opts) {
        super({});
        this.apiKey = opts.apiKey;
        this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
        this.provider = opts.provider || 'neuroswitch';
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
    /** Core generation for LangChain */
    async _generate(messages, _options, _runManager) {
        const prompt = this.messagesToPrompt(messages);
        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                Authorization: `ApiKey ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, provider: this.provider }),
        });
        if (!res.ok) {
            throw new Error(`Fusion API error: ${res.status} - ${await res.text()}`);
        }
        const data = (await res.json());
        const text = data?.response?.text ?? data?.text ?? '';
        // Construct AIMessage
        const aiMsg = new messages_1.AIMessage({
            content: text,
            response_metadata: {
                model: data?.model,
                provider: data?.provider,
                tokens: data?.tokens,
                cost: data?.cost_charged_to_credits,
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
            description: 'Chat Model for Fusion AI',
            defaults: { name: 'Fusion Chat Model' },
            inputs: [],
            // Expose proper AI language model output so AI Agent connects
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
        const model = new FusionLangChainChat({
            apiKey: String(credentials.apiKey),
            baseUrl,
            provider,
        });
        // The AI Agent expects a LangChain ChatModel instance here
        return { response: model };
    }
}
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map