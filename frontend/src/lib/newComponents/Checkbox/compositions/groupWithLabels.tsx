import React from "react";

import { withDefaults } from "@lib/newComponents/_shared/utils/defaultProps";
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

const DEFAULT_PROPS = {
    layout: "vertical",
} satisfies Partial<GroupWithLabelsProps>;

export const GroupWithLabels = React.forwardRef<HTMLDivElement, GroupWithLabelsProps>(
    function SimpleCheckboxGroup(props, ref) {
        const defaultedProps = withDefaults(props, DEFAULT_PROPS);
        const { options, layout, layoutClassName, layoutStyle, ...groupProps } = defaultedProps;
        return (
            <CheckboxGroup
                {...groupProps}
                ref={ref}
                layoutClassName={resolveClassNames(layoutClassName, "flex", {
                    "flex-row": layout === "horizontal",
                    "flex-col": layout === "vertical",
                })}
                layoutStyle={layoutStyle}
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
