import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { CheckboxGroup, type CheckboxGroupProps } from "../_baseComponents/checkboxGroup";

import { WithLabel } from "./withLabel";

export type CheckboxOption = {
    label: string;
    value: string;
    disabled?: boolean;
};

export type GroupWithLabelsProps = {
    options: CheckboxOption[];
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
