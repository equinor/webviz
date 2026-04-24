import { resolveClassNames } from "@lib/utils/resolveClassNames";
import React from "react";

import { Switch, SwitchProps } from "../_baseComponents/switch";

export type SwitchItemProps = SwitchProps & {
    label?: string;
    children?: React.ReactNode;
};

export function SwitchItem(props: SwitchItemProps) {
    const { label, children, ...switchProps } = props;
    return (
        <label
            data-disabled={switchProps.disabled}
            className={resolveClassNames("selectable gap-horizontal-xs flex items-center")}
            data-selectable-wrapper
        >
            <Switch {...switchProps} />
            {children ?? label}
        </label>
    );
}
