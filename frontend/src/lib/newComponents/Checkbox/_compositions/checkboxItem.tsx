import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { CheckboxProps } from "../_baseComponents/checkbox";
import { Checkbox } from "../_baseComponents/checkbox";

export type CheckboxItemProps = CheckboxProps & {
    label?: string;
    children?: React.ReactNode;
    direction?: "horizontal" | "vertical";
};

export const CheckboxItem = React.forwardRef<HTMLLabelElement, CheckboxItemProps>(function CheckboxItem(props, ref) {
    const { label, children, direction = "horizontal", layoutClassName, ...checkboxProps } = props;

    return (
        <label
            ref={ref}
            data-disabled={checkboxProps.disabled || undefined}
            data-readonly={checkboxProps.readOnly || undefined}
            className={resolveClassNames(layoutClassName, "selectable gap-horizontal-xs flex items-center", {
                "flex-col": direction === "vertical",
            })}
            data-selectable-wrapper
        >
            <Checkbox {...checkboxProps} />
            {children ?? label}
        </label>
    );
});
