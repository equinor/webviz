import type React from "react";

import { upperFirst } from "lodash";

import { SharedGroupLabel } from "@lib/components/_shared/components/menus/groupLabel";

import type { ComboboxGroup } from "../types";

export type ComboboxGroupLabelProps = {
    group: ComboboxGroup<any>;
};

export function ComboboxGroupLabel(props: ComboboxGroupLabelProps): React.ReactNode {
    return <SharedGroupLabel>{upperFirst(props.group.value)}</SharedGroupLabel>;
}
