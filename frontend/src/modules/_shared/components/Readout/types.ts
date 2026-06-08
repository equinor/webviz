import type React from "react";

export type ReadoutProperty<T = any> = {
    name: string;
    value: T;
    format?: (value: T) => string;
    render?: (name: string, value: T) => React.ReactNode;
};
export type CategoricalReadout = {
    name: string;
    icon?: React.ReactNode;
    group?: string;
    properties?: ReadoutProperty[];
};
