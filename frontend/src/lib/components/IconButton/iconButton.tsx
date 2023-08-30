import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Button as ButtonUnstyled, ButtonProps as ButtonUnstyledProps } from "@mui/base";

import { BaseComponent } from "../BaseComponent";

export type IconButtonProps = {
    children: React.ReactNode;
    size?: "small" | "medium" | "large";
    color?: "primary" | "danger" | "success";
};

export const IconButton = React.forwardRef(
    (props: ButtonUnstyledProps & IconButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
        const { children, color, size, ...rest } = props;
        return (
            <BaseComponent disabled={rest.disabled}>
                <ButtonUnstyled
                    {...rest}
                    ref={ref}
                    slotProps={{
                        root: {
                            className: resolveClassNames(
                                {
                                    "text-indigo-600": color === "primary" || !color,
                                    "text-red-600": color === "danger",
                                    "text-green-600": color === "success",
                                },
                                "hover:bg-gray-300",
                                "inline-flex",
                                "items-center",
                                "justify-center",
                                "rounded-full",
                                "p-1",
                                "focus:outline-none",
                                {
                                    "w-6 h-6": size === "small",
                                    "w-9 h-9": size === "medium" || !size,
                                    "w-12 h-12": size === "large",
                                }
                            ),
                        },
                    }}
                >
                    {children}
                </ButtonUnstyled>
            </BaseComponent>
        );
    }
);

IconButton.displayName = "IconButton";
