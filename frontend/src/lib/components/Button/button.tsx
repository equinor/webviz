import React from "react";

import { ButtonUnstyled, ButtonUnstyledProps } from "@mui/base";

import { BaseComponent } from "../_BaseComponent";
import { resolveClassNames } from "../_utils/resolveClassNames";

export type ButtonProps = {
    variant?: "text" | "outlined" | "contained";
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
} & ButtonUnstyledProps;

export const Button = React.forwardRef((props: ButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    // eslint-disable-next-line react/destructuring-assignment
    const { disabled, variant, children, startIcon, endIcon, ...rest } = props;
    const classNames = ["inline-flex", "items-center", "px-4", "py-2", "font-medium", "rounded-md"];

    if (variant === "outlined") {
        classNames.push("border", "border-indigo-600", "text-indigo-600", "bg-transparent", "hover:bg-indigo-50");
    } else if (variant === "contained") {
        classNames.push("border", "border-transparent", "text-white", "bg-indigo-600", "hover:bg-indigo-700");
    } else {
        classNames.push("text-indigo-600", "bg-transparent", "hover:bg-indigo-100");
    }

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
