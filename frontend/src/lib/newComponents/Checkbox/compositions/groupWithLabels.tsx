import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { CheckboxGroup, type CheckboxGroupProps } from "../_components/checkboxGroup";

import { WithLabel } from "./withLabel";

export type CheckboxOption = {
    /** The display text for this option. */
    label: string;
    /** The value submitted when this option is checked. */
    value: string;
    /** When true, disables this individual option regardless of the group's disabled state. */
    disabled?: boolean;
};

export type GroupWithLabelsProps = {
    /** The list of checkbox options to render. */
    options: CheckboxOption[];
    /** Whether to stack options vertically or horizontally. @default "vertical" */
    layout?: "vertical" | "horizontal";
} & CheckboxGroupProps;

export const GroupWithLabels = React.forwardRef<HTMLDivElement, GroupWithLabelsProps>(
    function SimpleCheckboxGroup(props, ref) {
        const { options, layout = "vertical", ...groupProps } = props;
        return (
            <CheckboxGroup
                {...groupProps}
                ref={ref}
                layoutClassName={resolveClassNames("flex", {
                    "flex-row": layout === "horizontal",
                    "flex-col": layout === "vertical",
                })}
            >
                {options.map((option) => (
                    <WithLabel
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        disabled={option.disabled ?? groupProps.disabled}
                    />
                ))}
            </CheckboxGroup>
        );
    },
);
