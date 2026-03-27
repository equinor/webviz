import type React from "react";

export type ReadoutProperty<T = any> = {
    name: string;
    value: T;
    render?: (name: string, value: T) => React.ReactNode;
};
export type CategoricalReadout = {
    name: string;
    icon?: React.ReactNode;
    group?: string;
    properties?: ReadoutProperty[];
};
