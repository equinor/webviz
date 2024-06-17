import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Button as ButtonUnstyled, ButtonProps as ButtonUnstyledProps } from "@mui/base";

import { BaseComponent } from "../BaseComponent";

export type ButtonProps = {
    variant?: "text" | "outlined" | "contained";
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    color?: "primary" | "danger" | "success" | string;
    size?: "small" | "medium" | "large";
} & ButtonUnstyledProps;

export const Button = React.forwardRef((props: ButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const { disabled, variant, children, startIcon, endIcon, color, ...rest } = props;
    const classNames = [
        "inline-flex",
        "items-center",
        ...(props.size === "medium"
            ? ["px-2", "py-1"]
            : props.size === "small"
            ? ["px-1", "py-0.5"]
            : ["px-4", "py-2"]),
        "font-medium",
        "rounded-md",
    ];

    if (variant === "outlined") {
        classNames.push("border", "bg-transparent");
        if (color === "primary" || !color) {
            classNames.push("border-indigo-600", "text-indigo-600", "hover:bg-indigo-50");
        } else if (color === "danger") {
            classNames.push(`text-red-600`, `border-red-600`, `hover:bg-red-50`);
        } else if (color === "success") {
            classNames.push("border-green-600", "text-green-600", "hover:bg-green-50");
        }
    } else if (variant === "contained") {
        classNames.push("border", "border-transparent", "text-white");
        if (color === "primary" || !color) {
            classNames.push("bg-indigo-600", "hover:bg-indigo-700");
        } else if (color === "danger") {
            classNames.push(`bg-red-600`, `hover:bg-red-700`);
        } else if (color === "success") {
            classNames.push("bg-green-600", "hover:bg-green-700");
        }
    } else {
        classNames.push("bg-transparent");
        if (color === "primary" || !color) {
            classNames.push("text-indigo-600", "hover:bg-indigo-100");
        } else if (color === "danger") {
            classNames.push(`text-red-600`, `hover:bg-red-100`);
        } else {
            classNames.push("text-green-600", "hover:bg-green-100");
        }
    }

    classNames.push(props.className ?? "");

    const adjustedChildren = (
        <div className="flex items-center gap-2">
            {startIcon}
            {children}
            {endIcon}
        </div>
    );

    return (
        <BaseComponent disabled={disabled}>
            <ButtonUnstyled
                {...rest}
                ref={ref}
                slotProps={{
                    root: {
                        className: resolveClassNames(...classNames),
                    },
                }}
            >
                {adjustedChildren}
            </ButtonUnstyled>
        </BaseComponent>
    );
});

Button.displayName = "Button";
