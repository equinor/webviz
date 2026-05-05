import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { CheckboxGroup, type CheckboxGroupProps } from "../_baseComponents/checkboxGroup";

import { CheckboxItem } from "./checkboxItem";

export type CheckboxOption = {
    label: string;
    value: string;
    disabled?: boolean;
};

export type SimpleCheckboxGroupProps = {
    options: CheckboxOption[];
    layout?: "vertical" | "horizontal";
} & CheckboxGroupProps;

export const SimpleCheckboxGroup = React.forwardRef<HTMLDivElement, SimpleCheckboxGroupProps>(
    function SimpleCheckboxGroup(props, ref) {
        const { options, layout = "vertical", ...groupProps } = props;
        return (
            <CheckboxGroup
                {...groupProps}
                ref={ref}
                layoutClassName={resolveClassNames("gap-x-horizontal-sm gap-y-vertical-sm flex", {
                    "flex-row": layout === "horizontal",
                    "flex-col": layout === "vertical",
                })}
            >
                {options.map((option) => (
                    <CheckboxItem
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
