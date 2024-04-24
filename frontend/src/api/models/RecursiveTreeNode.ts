/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RecursiveTreeNode = {
    node_type: RecursiveTreeNode.node_type;
    node_label: string;
    edge_label: string;
    node_data: Record<string, Array<number>>;
    edge_data: Record<string, Array<number>>;
    children: Array<RecursiveTreeNode>;
};
export namespace RecursiveTreeNode {
    export enum node_type {
        GROUP = 'Group',
        WELL = 'Well',
    }
}

