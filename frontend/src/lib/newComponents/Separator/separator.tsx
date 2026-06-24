import React from "react";

import { Separator as SeparatorBase, type SeparatorProps as SeparatorBaseProps } from "@base-ui/react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { withDefaults } from "../_shared/utils/defaultProps";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

/** Horizontal or vertical divider line. Use `layoutClassName` for spacing. */
export type SeparatorProps = ComponentWrapperProps<{
    /** Whether the separator is horizontal or vertical. @default "horizontal" */
    orientation?: SeparatorBaseProps["orientation"];
}>;

const DEFAULT_PROPS = {
    orientation: "horizontal",
} satisfies Partial<SeparatorProps>;

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(function Separator(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const baseProps = resolveWrapperProps(defaultedProps);
    const resolvedClassNames = resolveClassNames(
        baseProps.className,
        "bg-neutral-strong/30 [:where(&+&)]:hidden shrink-0 self-stretch",
        defaultedProps.orientation === "vertical" ? "w-px  mx-3xs" : "h-px my-3xs",
    );
    return <SeparatorBase {...baseProps} className={resolvedClassNames} ref={ref} />;
});
