import { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class Fusion implements INodeType {
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
//# sourceMappingURL=Fusion.node.d.ts.map