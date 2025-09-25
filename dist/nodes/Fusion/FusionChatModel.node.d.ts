import { ILoadOptionsFunctions, INodeType, INodeTypeDescription, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
export declare class FusionChatModel implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getModels(this: ILoadOptionsFunctions): Promise<{
                name: any;
                value: any;
            }[]>;
        };
    };
    supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
}
//# sourceMappingURL=FusionChatModel.node.d.ts.map