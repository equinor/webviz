import type React from "react";

export type ReadoutProperty<T = any, RenderArgs = Record<string, any>> = {
    name: string;
    value: T;
    renderArgs?: RenderArgs;
    format?: (value: T) => string;
    render?: (name: string, value: T, args?: RenderArgs) => React.ReactNode;
};
export type CategoricalReadout = {
    name: string;
    icon?: React.ReactNode;
    group?: string;
    properties?: ReadoutProperty[];
};
