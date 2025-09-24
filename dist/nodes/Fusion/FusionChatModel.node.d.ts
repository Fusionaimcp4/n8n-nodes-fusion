import { IExecuteFunctions, ILoadOptionsFunctions, INodeType, INodeTypeDescription, INodeExecutionData } from 'n8n-workflow';
export declare class FusionChatModel implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getModels(this: ILoadOptionsFunctions): Promise<{
                name: string;
                value: any;
            }[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
//# sourceMappingURL=FusionChatModel.node.d.ts.map