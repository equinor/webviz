import React from "react";

import type { SwitchRootProps } from "@base-ui/react";
import { Switch as SwitchBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

/** Accepts all standard switch props except `className`, `render`, and `style`. Use `layoutClassName` for layout adjustments. */
export type SwitchProps = ComponentWrapperProps<Omit<SwitchRootProps, "ref">>;

export const Switch = React.forwardRef<HTMLSpanElement, SwitchProps>(function Switch(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return (
        <SwitchBase.Root
            {...baseProps}
            ref={ref}
            className={resolveClassNames(
                props.layoutClassName,
                "selectable group/switch relative box-border inline-flex aspect-square w-fit appearance-none rounded-full border-0",
            )}
        >
            <span className="min-h-selectable-sm flex aspect-square">
                <span className="not-group-data-disabled/switch:not-group-data-readonly/switch:group-hover/switch:bg-neutral-surface group-data-checked/switch:bg-accent not-group-data-disabled/switch:not-group-data-readonly/switch:group-data-checked/switch:group-hover/switch:bg-neutral-surface group-data-disabled/switch:bg-disabled bg-neutral relative top-1/2 flex h-1.5 grow -translate-y-1/2 rounded-full">
                    <SwitchBase.Thumb className="time shadow-elevation-raised group-data-disabled/switch:shadow-elevation-floating bg-neutral-strong not-group-data-disabled/switch:not-group-data-readonly/switch:group-hover/switch:bg-accent-strong-hover group-data-checked/switch:bg-accent-strong group-data-disabled/switch:bg-disabled absolute top-1/2 left-0 aspect-square h-3 -translate-y-1/2 rounded-full transition-all duration-200 ease-linear data-checked:left-[calc(100%-0.75rem)]" />
                </span>
            </span>
        </SwitchBase.Root>
    );
});
