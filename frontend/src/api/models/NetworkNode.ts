/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type NetworkNode = {
    node_type: NetworkNode.node_type;
    node_label: string;
    edge_label: string;
    node_data: Record<string, Array<number>>;
    edge_data: Record<string, Array<number>>;
    children: Array<NetworkNode>;
};
export namespace NetworkNode {
    export enum node_type {
        GROUP = 'Group',
        WELL = 'Well',
    }
}

