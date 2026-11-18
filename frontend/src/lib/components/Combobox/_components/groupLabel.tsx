import type React from "react";

import { upperFirst } from "lodash";

import { SharedGroupLabel } from "@lib/components/_shared/components/menus/groupLabel";

import type { ComboboxGroup } from "../types";

export type ComboboxGroupLabelProps = {
    group: ComboboxGroup<any>;
    /** Overrides the label derived from the group value. */
    label?: string;
};

export function ComboboxGroupLabel(props: ComboboxGroupLabelProps): React.ReactNode {
    const label = props.label ?? upperFirst(props.group.value);
    if (!label) {
        return null;
    }
    return <SharedGroupLabel>{label}</SharedGroupLabel>;
}
