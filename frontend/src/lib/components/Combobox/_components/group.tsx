import type React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import type { ComboboxGroup } from "../types";

import { ComboboxGroupLabel } from "./groupLabel";

export type GroupProps<TValue> = {
    group: ComboboxGroup<TValue>;
    children: (value: TValue) => React.ReactNode;
};

export function ComboboxListGroup<TValue>(props: GroupProps<TValue>): React.ReactNode {
    return (
        <ComboboxBase.Group items={props.group.items} className="contents">
            <ComboboxGroupLabel group={props.group} />
            <ComboboxBase.Collection>{props.children}</ComboboxBase.Collection>
        </ComboboxBase.Group>
    );
}
