import type React from "react";

export interface TreeDataNode {
    id?: string;
    name: string;
    description?: string;
    color?: string;
    icon?: React.ReactNode;
    children?: Array<TreeDataNode>;
}

export interface TreeDataNodeMetaData {
    id?: string;
    description?: string;
    color?: string;
    icon?: React.ReactNode;
    numChildren: number;
}
