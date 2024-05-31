/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TreeNode = {
    node_type: TreeNode.node_type;
    node_label: string;
    edge_label: string;
    node_data: Record<string, Array<number>>;
    edge_data: Record<string, Array<number>>;
    children: Array<TreeNode>;
};
export namespace TreeNode {
    export enum node_type {
        GROUP = 'Group',
        WELL = 'Well',
    }
}

