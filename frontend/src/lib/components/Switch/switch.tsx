import React from "react";

import { Switch as SwitchUnstyled, UseSwitchParameters, useSwitch } from "@mui/base";

import { BaseComponent } from "../_BaseComponent";
import { resolveClassNames } from "../_utils/resolveClassNames";

export type SwitchProps = UseSwitchParameters & {
    condensed?: boolean;
    title?: string;
};

export const Switch = React.forwardRef((props: SwitchProps, ref: React.ForwardedRef<HTMLInputElement>) => {
    const { getInputProps, checked, disabled } = useSwitch(props);

    return (
        <BaseComponent disabled={disabled}>
            <SwitchUnstyled
                {...getInputProps()}
                title={props.title}
                ref={ref}
                slotProps={{
                    root: {
                        className: resolveClassNames(
                            "relative",
                            "inline-block",
                            props.condensed ? "w-6" : "w-10",
                            props.condensed ? "h-4" : "h-6",
                            "cursor-pointer",
                            "rounded-full",
                            checked ? "bg-blue-500" : "bg-gray-400",
                            {
                                "bg-blue-500": checked,
                            }
                        ),
                    },
                    input: {
                        className: resolveClassNames(
                            "cursor-inherit",
                            "absolute",
                            "w-full",
                            "h-full",
                            "top-0",
                            "left-0",
                            "m-0",
                            "p-0",
                            "opacity-0",
                            "z-1",
                            "cursor-pointer"
                        ),
                    },
                    thumb: {
                        className: resolveClassNames(
                            "block",
                            props.condensed ? "w-2" : "w-4",
                            props.condensed ? "h-2" : "h-4",
                            "top-1",
                            checked ? (props.condensed ? "left-3" : "left-5") : "left-1",
                            "rounded-full",
                            "bg-white",
                            "relative",
                            "transition-all",
                            "z-2"
                        ),
                    },
                }}
            />
        </BaseComponent>
    );
});

Switch.displayName = "Switch";
