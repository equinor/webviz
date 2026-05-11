export interface TreeDataNode {
    id?: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    children?: Array<TreeDataNode>;
}

export interface TreeDataNodeMetaData {
    id?: string;
    description?: string;
    color?: string;
    icon?: string;
    numChildren: number;
}
