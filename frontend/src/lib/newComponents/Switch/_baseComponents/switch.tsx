import { Switch as SwitchBase, SwitchRootProps } from "@base-ui/react";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import React from "react";

export type SwitchProps = Omit<SwitchRootProps, "className" | "style" | "ref">;

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(props, ref) {
    const defaultedProps = { ...props };

    return (
        <SwitchBase.Root
            {...defaultedProps}
            ref={ref}
            className={resolveClassNames(
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
