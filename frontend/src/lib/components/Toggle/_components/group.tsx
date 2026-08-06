import React from "react";

import { ToggleGroup as ToggleGroupBase, type ToggleGroupProps as ToggleGroupBaseProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

/** Accepts all standard toggle group props except `className`, `render`, and `style`. Use `layoutClassName` for layout adjustments. */
export type GroupProps<TValue extends string> = ComponentWrapperProps<ToggleGroupBaseProps<TValue>>;

export const Group = React.forwardRef<HTMLDivElement, GroupProps<string>>(function ToggleGroup<TValue extends string>(
    props: GroupProps<TValue>,
    ref: React.ForwardedRef<HTMLDivElement>,
) {
    const baseProps = resolveWrapperProps(props);
    const vertical = baseProps.orientation === "vertical";
    return (
        <ToggleGroupBase
            {...baseProps}
            ref={ref}
            className={resolveClassNames(
                baseProps.className,
                "flex items-center justify-center",
                // Bring hovered/focused button outline above its neighbours
                "*:relative [&>*:focus-visible]:z-10 [&>*:hover]:z-10",
                // Middle children are always fully square (! overrides Button's own `rounded` class)
                "[&>*:not(:first-child):not(:last-child)]:rounded-none!",
                {
                    // ── Horizontal ──────────────────────────────────────────
                    // Collapse the double outline between adjacent buttons
                    "[&>*:not(:first-child)]:-ml-px": !vertical,
                    // Square off the touching corners
                    "[&>*:first-child:not(:last-child)]:rounded-r-none!": !vertical,
                    "[&>*:last-child:not(:first-child)]:rounded-l-none!": !vertical,

                    // ── Vertical ─────────────────────────────────────────────
                    "flex-col *:w-full": vertical,
                    "[&>*:not(:first-child)]:-mt-px": vertical,
                    "[&>*:first-child:not(:last-child)]:rounded-b-none!": vertical,
                    "[&>*:last-child:not(:first-child)]:rounded-t-none!": vertical,
                },
            )}
        />
    );
});
