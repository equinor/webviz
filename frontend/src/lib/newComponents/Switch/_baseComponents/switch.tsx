import React from "react";

import type { SwitchRootProps } from "@base-ui/react";
import { Switch as SwitchBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SwitchProps = ComponentWrapperProps<Omit<SwitchRootProps, "ref">>;

export const Switch = React.forwardRef<HTMLSpanElement, SwitchProps>(function Switch(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return (
        <SwitchBase.Root
            {...baseProps}
            ref={ref}
            className={resolveClassNames(
                props.layoutClassName,
                "group p-selectable-y selectable relative box-border flex aspect-square appearance-none rounded-full border-0",
            )}
        >
            <span className="h-selectable-sm flex aspect-square">
                <span className="group-data-checked:bg-accent group-data-disabled:bg-disabled group-data-disabled:hover:bg-disabled bg-neutral relative top-1/2 flex h-1.5 grow -translate-y-1/2 rounded-full">
                    <SwitchBase.Thumb className="time shadow-elevation-raised group-data-disabled:shadow-elevation-floating bg-neutral-strong group-hover:bg-accent-strong-hover group-data-checked:bg-accent-strong group-data-disabled:bg-disabled absolute top-1/2 left-0 aspect-square h-3 -translate-y-1/2 rounded-full transition-all duration-200 ease-linear data-checked:left-[calc(100%-0.75rem)]" />
                </span>
            </span>
        </SwitchBase.Root>
    );
});
