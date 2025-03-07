import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { UseSwitchParameters } from "@mui/base";
import { Switch as SwitchUnstyled, useSwitch } from "@mui/base";

import { BaseComponent } from "../BaseComponent";

export type SwitchProps = UseSwitchParameters & {
    switchRef?: React.Ref<HTMLSpanElement>;
    inputRef?: React.Ref<HTMLInputElement>;
    thumbRef?: React.Ref<HTMLSpanElement>;
    rootRef?: React.Ref<HTMLSpanElement>;
};

function SwitchComponent(props: SwitchProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const { getInputProps, checked, disabled } = useSwitch(props);

    const switchRef = React.useRef<HTMLSpanElement>(null);
    React.useImperativeHandle<HTMLSpanElement | null, HTMLSpanElement | null>(props.switchRef, () => switchRef.current);

    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle<HTMLInputElement | null, HTMLInputElement | null>(props.inputRef, () => inputRef.current);

    const rootRef = React.useRef<HTMLSpanElement>(null);
    React.useImperativeHandle<HTMLSpanElement | null, HTMLSpanElement | null>(props.rootRef, () => rootRef.current);

    const thumbRef = React.useRef<HTMLSpanElement>(null);
    React.useImperativeHandle<HTMLSpanElement | null, HTMLSpanElement | null>(props.thumbRef, () => thumbRef.current);

    return (
        <BaseComponent ref={ref} disabled={disabled}>
            <SwitchUnstyled
                {...getInputProps()}
                ref={switchRef}
                slotProps={{
                    root: {
                        className: resolveClassNames(
                            "relative",
                            "inline-block",
                            "w-10",
                            "h-6",
                            "cursor-pointer",
                            "rounded-full",
                            checked ? "bg-blue-500" : "bg-gray-400",
                            {
                                "bg-blue-500": checked,
                            },
                        ),
                        ref: rootRef,
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
                            "cursor-pointer",
                        ),
                        ref: inputRef,
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
                        ),
                        ref: thumbRef,
                    },
                }}
            />
        </BaseComponent>
    );
}

export const Switch = React.forwardRef(SwitchComponent);
