import { INodeType, INodeTypeDescription, ILoadOptionsFunctions } from 'n8n-workflow';
import { BaseChatModel, BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';
import { BaseMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';
declare class FusionLangChainChat extends BaseChatModel<BaseChatModelCallOptions> {
    private model;
    private options;
    private apiKey;
    private baseUrl;
    private _boundTools?;
    private _toolAllowedKeys?;
    private timeout;
    private maxRetries;
    supportsToolCalling: boolean;
    get _supportsToolCalling(): boolean;
    get supportsToolChoice(): boolean;
    get supportsStructuredOutput(): boolean;
    bindTools(tools: any[]): this;
    constructor(args: {
        model: string;
        options: any;
        apiKey: string;
        baseUrl: string;
    });
    _llmType(): string;
    _generate(messages: BaseMessage[], _options?: BaseChatModelCallOptions): Promise<ChatResult>;
}
export declare class FusionChatModel implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getModels(this: ILoadOptionsFunctions): Promise<{
                name: string;
                value: string;
            }[]>;
        };
    };
    supplyData(this: any, itemIndex: number): Promise<{
        response: FusionLangChainChat;
    }>;
}
export {};
//# sourceMappingURL=FusionChatModel.node.d.ts.map