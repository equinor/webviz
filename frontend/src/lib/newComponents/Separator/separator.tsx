import React from "react";

import { Separator as SeparatorBase, type SeparatorProps as SeparatorBaseProps } from "@base-ui/react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { resolveWrapperProps, type LayoutClassProps } from "../_shared/utils/wrapperProps";

/** Horizontal or vertical divider line. Use `layoutClassName` for spacing. */
export type SeparatorProps = Pick<SeparatorBaseProps, "orientation"> & LayoutClassProps;

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(function Separator(props, ref) {
    const baseProps = resolveWrapperProps(props, "layoutClassName", "orientation");
    const resolvedClassNames = resolveClassNames(
        props.layoutClassName,
        "bg-neutral-strong/30 [:where(&+&)]:hidden shrink-0 self-stretch",
        props.orientation === "vertical" ? "w-px  mx-3xs" : "h-px my-3xs",
    );
    return <SeparatorBase {...baseProps} className={resolvedClassNames} ref={ref} />;
});
