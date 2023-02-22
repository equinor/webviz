import React from "react";

import { SwitchUnstyled, UseSwitchParameters, switchUnstyledClasses, useSwitch } from "@mui/base";

import { resolveClassNames } from "../_utils/resolveClassNames";

export const Switch = React.forwardRef((props: UseSwitchParameters, ref: React.ForwardedRef<HTMLInputElement>) => {
    const { getInputProps, checked, disabled, focusVisible } = useSwitch(props);

    console.log(checked);

    return (
        <SwitchUnstyled
            {...getInputProps()}
            slotProps={{
                root: {
                    className: resolveClassNames(
                        "relative",
                        "inline-block",
                        "w-10",
                        "h-6",
                        "m-4",
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
                        "w-4",
                        "h-4",
                        "top-1",
                        checked ? "left-5" : "left-1",
                        "rounded-full",
                        "bg-white",
                        "relative",
                        "transition-all",
                        "z-2"
                    ),
                },
            }}
        />
    );
});

Switch.displayName = "Switch";
