import React from "react";

import { type SelectableSize } from "@lib/newComponents/_shared/size";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { RadioGroup, type RadioGroupProps } from "../_baseComponents/group";

import { WithLabel } from "./withLabel";

export type RadioOption = {
    label: string;
    value: string;
    disabled?: boolean;
};

export type GroupWithLabels = {
    options: RadioOption[];
    layout?: "vertical" | "horizontal";
    size?: SelectableSize;
} & RadioGroupProps;

export const GroupWithLabels = React.forwardRef<HTMLDivElement, GroupWithLabels>(function GroupWithLabels(props, ref) {
    const { options, layout = "vertical", size = "default", layoutClassName, ...groupProps } = props;

    return (
        <RadioGroup
            {...groupProps}
            ref={ref}
            layoutClassName={resolveClassNames(
                layoutClassName,
                "flex",
                layout === "horizontal" ? "flex-row" : "flex-col",
            )}
        >
            {options.map((option) => (
                <WithLabel
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    disabled={option.disabled ?? groupProps.disabled}
                    size={size}
                />
            ))}
        </RadioGroup>
    );
});
