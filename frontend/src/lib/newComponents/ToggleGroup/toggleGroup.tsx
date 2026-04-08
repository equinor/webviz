import React from "react";

import { ToggleGroup as ToggleGroupBase, type ToggleGroupProps as ToggleGroupBaseProps } from "@base-ui/react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ToggleGroupProps<TValue extends string> = Omit<ToggleGroupBaseProps<TValue>, "className" | "style"> & {};

function ToggleGroupComponent<TValue extends string>(
    props: ToggleGroupProps<TValue>,
    ref: React.ForwardedRef<HTMLDivElement>,
) {
    return (
        <ToggleGroupBase
            {...props}
            ref={ref}
            className={resolveClassNames("flex items-center justify-center", {
                "flex-col": props.orientation === "vertical",
            })}
        />
    );
}

export const ToggleGroup = React.forwardRef(ToggleGroupComponent as any) as <TValue extends string>(
    props: ToggleGroupProps<TValue> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;
