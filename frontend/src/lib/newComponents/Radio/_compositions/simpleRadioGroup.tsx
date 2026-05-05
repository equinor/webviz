import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { RadioGroup, type RadioGroupProps } from "../_baseComponents/group";

import { RadioItem } from "./radioItem";

export type RadioOption = {
    label: string;
    value: string;
    disabled?: boolean;
};

export type SimpleRadioGroupProps = {
    options: RadioOption[];
    layout?: "vertical" | "horizontal";
} & RadioGroupProps;

export const SimpleRadioGroup = React.forwardRef<HTMLDivElement, SimpleRadioGroupProps>(
    function SimpleRadioGroup(props, ref) {
        const { options, layout = "vertical", layoutClassName, ...groupProps } = props;

        return (
            <RadioGroup
                {...groupProps}
                ref={ref}
                layoutClassName={resolveClassNames(
                    layoutClassName,
                    "flex gap-x-horizontal-sm gap-y-vertical-sm",
                    layout === "horizontal" ? "flex-row" : "flex-col",
                )}
            >
                {options.map((option) => (
                    <RadioItem
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        disabled={option.disabled ?? groupProps.disabled}
                    />
                ))}
            </RadioGroup>
        );
    },
);
