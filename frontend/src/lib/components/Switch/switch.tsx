import React from "react";

import type { UseSwitchParameters } from "@mui/base";
import { Switch as SwitchUnstyled, useSwitch } from "@mui/base";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { BaseComponent } from "../BaseComponent";

export type SwitchProps = UseSwitchParameters & {
    id?: string;
    size?: "small" | "medium";
    switchRef?: React.Ref<HTMLSpanElement>;
    inputRef?: React.Ref<HTMLInputElement>;
    thumbRef?: React.Ref<HTMLSpanElement>;
    rootRef?: React.Ref<HTMLSpanElement>;
};

function SwitchComponent(props: SwitchProps, ref: React.ForwardedRef<HTMLDivElement>) {
    const { getInputProps, checked, disabled } = useSwitch(props);
    const sizeOrDefault = props.size ?? "medium";
    const widthSpacingMultiplier = {
        medium: 10,
        small: 7,
    }[sizeOrDefault];

    const switchRef = React.useRef<HTMLSpanElement>(null);
    React.useImperativeHandle<HTMLSpanElement | null, HTMLSpanElement | null>(props.switchRef, () => switchRef.current);

    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle<HTMLInputElement | null, HTMLInputElement | null>(props.inputRef, () => inputRef.current);

    const rootRef = React.useRef<HTMLSpanElement>(null);
    React.useImperativeHandle<HTMLSpanElement | null, HTMLSpanElement | null>(props.rootRef, () => rootRef.current);

    const thumbRef = React.useRef<HTMLSpanElement>(null);
    React.useImperativeHandle<HTMLSpanElement | null, HTMLSpanElement | null>(props.thumbRef, () => thumbRef.current);

    return (
        <BaseComponent
            className={resolveClassNames({
                "h-6": sizeOrDefault === "medium",
                "h-4": sizeOrDefault === "small",
            })}
            ref={ref}
            disabled={disabled}
            style={{
                // Adding the track width as a variable to make it easier to position thumb for assorted sizes
                // @ts-expect-error -- React type doesn't let you add variables
                "--track-width": `calc(var(--spacing) * ${widthSpacingMultiplier})`,
                "--inner-track-width": `calc(var(--spacing) * ${widthSpacingMultiplier - 2})`,
            }}
        >
            <SwitchUnstyled
                {...getInputProps()}
                ref={switchRef}
                slotProps={{
                    root: {
                        className: resolveClassNames(
                            "focus-within:outline-2 outline-indigo-500",
                            "relative",
                            "inline-block",
                            "cursor-pointer",
                            "rounded-full",
                            "px-1",
                            "w-(--track-width)",
                            checked ? "bg-blue-500 outline-blue-500" : "bg-gray-400  outline-indigo-500",
                            {
                                "h-6": sizeOrDefault === "medium",
                                "h-4": sizeOrDefault === "small",
                                "bg-blue-500": checked,
                            },
                        ),
                        ref: rootRef,
                    },
                    input: {
                        id: props.id,
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
                            "absolute",
                            "block",
                            {
                                "size-4 top-1": sizeOrDefault === "medium",
                                "size-2 top-1": sizeOrDefault === "small",

                                "translate-x-0": !checked,
                                "translate-x-[calc(var(--inner-track-width)-100%)]": checked,
                            },
                            "rounded-full",
                            "bg-white",
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
