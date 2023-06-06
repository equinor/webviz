import React from "react";

import { Slider as SliderUnstyled, SliderProps as SliderUnstyledProps } from "@mui/base";

import { BaseComponent } from "../_BaseComponent";
import { resolveClassNames } from "../_utils/resolveClassNames";

export const Slider = React.forwardRef((props: SliderUnstyledProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    return (
        <BaseComponent disabled={props.disabled}>
            <SliderUnstyled
                {...props}
                ref={ref}
                slotProps={{
                    root: {
                        className: resolveClassNames(
                            "w-full",
                            "h-3",
                            "pl-4",
                            "cursor-pointer",
                            "touch-action-none",
                            "inline-block",
                            "relative",
                            "hover:opacity-100"
                        ),
                    },

                    rail: {
                        className: resolveClassNames("block", "w-full", "h-1", "bg-gray-300", "rounded", "opacity-40"),
                    },
                    track: {
                        className: resolveClassNames(
                            "block",
                            "h-1",
                            "bg-indigo-600",
                            "rounded",
                            "absolute",
                            "top-0",
                            "left-0"
                        ),
                    },
                    thumb: {
                        className: resolveClassNames(
                            "absolute",
                            "w-5",
                            "h-5",
                            "-ml-2",
                            "-mt-2",
                            "box-border",
                            "block",
                            "bg-white",
                            "shadow-sm",
                            "rounded-full",
                            "top-0",
                            "left-0",
                            "cursor-pointer",
                            "border-2",
                            "border-gray-300",
                            "outline-none",
                            "focus:outline-none",
                            "hover:shadow-md",
                            "active:shadow-lg"
                        ),
                    },
                }}
            />
        </BaseComponent>
    );
});

Slider.displayName = "Slider";
