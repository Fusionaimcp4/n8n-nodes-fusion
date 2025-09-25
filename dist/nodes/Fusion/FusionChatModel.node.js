"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionChatModel = void 0;
class FusionChatModel {
    constructor() {
        this.description = {
            displayName: 'Fusion Chat Model',
            name: 'fusionChatModel',
            icon: 'file:fusion.svg',
            group: ['ai'],
            version: 1,
            subtitle: 'Language Model',
            description: 'Chat Model for Fusion AI',
            defaults: {
                name: 'Fusion Chat Model',
            },
            inputs: [],
            outputs: ["ai_languageModel" /* NodeConnectionType.AiLanguageModel */],
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
                    typeOptions: {
                        loadOptionsMethod: 'getModels',
                    },
                    default: 'neuroswitch',
                    description: 'Model to use for the chat completion',
                },
            ],
        };
        this.methods = {
            loadOptions: {
                async getModels() {
                    try {
                        const credentials = await this.getCredentials('fusionApi');
                        const baseUrl = credentials.baseUrl?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
                        const response = await this.helpers.httpRequest({
                            method: 'GET',
                            url: `${baseUrl}/api/models`,
                            headers: {
                                Authorization: `ApiKey ${credentials.apiKey}`,
                                'Content-Type': 'application/json',
                            },
                        });
                        const models = (response.data || response || []);
                        return models.map((model) => ({
                            name: `${model.name || model.id_string} ($${model.input_cost_per_million_tokens || 'N/A'}/1M)`,
                            value: model.id_string || model.id,
                        }));
                    }
                    catch (error) {
                        return [
                            { name: 'NeuroSwitch', value: 'neuroswitch' },
                            { name: 'OpenAI GPT-4', value: 'openai/gpt-4' },
                        ];
                    }
                },
            },
        };
    }
    async supplyData(itemIndex) {
        const credentials = await this.getCredentials('fusionApi');
        const baseUrl = credentials.baseUrl?.replace(/\/+$/, '') || 'https://api.mcp4.ai';
        const model = this.getNodeParameter('model', itemIndex);
        // Simple language model that matches what n8n expects
        const languageModel = {
            // Required properties
            _llmType: 'chat',
            modelName: model || 'fusion-neuroswitch',
            supportsToolCalling: true,
            // Main method n8n calls for chat models
            async generate(messages, options) {
                console.log('🎲 generate called with:', messages);
                // Extract user content from messages
                let userContent = '';
                if (Array.isArray(messages)) {
                    userContent = messages.map(msg => {
                        if (typeof msg === 'string')
                            return msg;
                        if (msg?.content)
                            return msg.content;
                        if (msg?.kwargs?.content)
                            return msg.kwargs.content;
                        return String(msg);
                    }).join('\n');
                }
                else {
                    userContent = String(messages);
                }
                console.log('📝 User content:', userContent);
                // Call Fusion API
                const response = await fetch(`${baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        Authorization: `ApiKey ${credentials.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: userContent,
                        provider: 'neuroswitch'
                    }),
                });
                if (!response.ok) {
                    throw new Error(`Fusion API error: ${response.status}`);
                }
                const data = await response.json();
                const responseText = data.response?.text || data.text || '';
                console.log('✅ Response:', responseText);
                // Return in the format n8n expects - a ChatResult object
                return {
                    generations: [{
                            text: responseText,
                            message: {
                                content: responseText,
                                additional_kwargs: {},
                                response_metadata: {
                                    model: data.model,
                                    provider: data.provider,
                                    tokens: data.tokens,
                                },
                                lc: 1,
                                type: "constructor",
                                id: ["langchain_core", "messages", "AIMessage"]
                            },
                            generationInfo: {
                                model: data.model,
                                provider: data.provider,
                            }
                        }],
                    llmOutput: {
                        model: data.model,
                        provider: data.provider,
                    }
                };
            },
            // Bind tools method
            bindTools(tools) {
                return {
                    ...this,
                    async generate(messages, options) {
                        return languageModel.generate(messages, { ...options, tools });
                    }
                };
            },
        };
        return {
            response: languageModel,
        };
    }
}
exports.FusionChatModel = FusionChatModel;
//# sourceMappingURL=FusionChatModel.node.js.map