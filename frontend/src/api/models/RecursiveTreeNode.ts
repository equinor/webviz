/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type RecursiveTreeNode = {
    node_type: string;
    node_label: string;
    edge_label: string;
    node_data: Record<string, Array<number>>;
    edge_data: Record<string, Array<number>>;
    children: Array<(RecursiveTreeNode | null)>;
};

