import React from "react";

import type { SwitchRootProps } from "@base-ui/react";
import { Switch as SwitchBase } from "@base-ui/react";

import { useComponentSize } from "@lib/newComponents/_shared/componentSizeContext";
import { getDataAttributesForSelectableSize, type SelectableSize } from "@lib/newComponents/_shared/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SwitchProps = ComponentWrapperProps<Omit<SwitchRootProps, "ref">> & {
    size?: SelectableSize;
};

export const Switch = React.forwardRef<HTMLSpanElement, SwitchProps>(function Switch(props, ref) {
    const size = useComponentSize(props);
    const baseProps = resolveWrapperProps(props, "size");

    return (
        <SwitchBase.Root
            {...baseProps}
            ref={ref}
            className={resolveClassNames(
                props.layoutClassName,
                "group/switch p-selectable-y selectable relative box-border inline-flex aspect-square w-fit appearance-none rounded-full border-0",
            )}
            {...getDataAttributesForSelectableSize(size, true)}
        >
            <span className="h-selectable-sm flex aspect-square">
                <span className="not-group-data-disabled/switch:not-group-data-readonly/switch:group-hover/switch:bg-neutral-surface group-data-checked/switch:bg-accent not-group-data-disabled/switch:not-group-data-readonly/switch:group-data-checked/switch:group-hover/switch:bg-neutral-surface group-data-disabled/switch:bg-disabled bg-neutral relative top-1/2 flex h-1.5 grow -translate-y-1/2 rounded-full">
                    <SwitchBase.Thumb className="time shadow-elevation-raised group-data-disabled/switch:shadow-elevation-floating bg-neutral-strong not-group-data-disabled/switch:not-group-data-readonly/switch:group-hover/switch:bg-accent-strong-hover group-data-checked/switch:bg-accent-strong group-data-disabled/switch:bg-disabled absolute top-1/2 left-0 aspect-square h-3 -translate-y-1/2 rounded-full transition-all duration-200 ease-linear data-checked:left-[calc(100%-0.75rem)]" />
                </span>
            </span>
        </SwitchBase.Root>
    );
});
