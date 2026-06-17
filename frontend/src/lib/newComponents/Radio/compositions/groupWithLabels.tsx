import React from "react";

import { omit } from "lodash";

import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { type SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { RadioGroup, type RadioGroupProps } from "../_components/group";

import { WithLabel } from "./withLabel";

export type RadioOption = {
    /** The display text for this option. */
    label: string;
    /** The value submitted when this option is selected. */
    value: string;
    /** When true, disables this individual option regardless of the group's disabled state. */
    disabled?: boolean;
};

export type GroupWithLabels = {
    /** The list of radio options to render. */
    options: RadioOption[];
    /** Whether to stack options vertically or horizontally. @default "vertical" */
    layout?: "vertical" | "horizontal";
    /** Size of each radio option. @default "default" */
    size?: SelectableSize;
} & RadioGroupProps;

export const GroupWithLabels = React.forwardRef<HTMLDivElement, GroupWithLabels>(function GroupWithLabels(props, ref) {
    const { options, layout = "vertical", layoutClassName, ...groupProps } = omit(props, "size");
    const size = useComponentSize(props);

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
