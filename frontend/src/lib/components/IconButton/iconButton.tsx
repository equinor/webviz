import React from "react";

import { ButtonUnstyled, ButtonUnstyledProps } from "@mui/base";

import { resolveClassNames } from "../_utils/resolveClassNames";

export type IconButtonProps = {
    children: React.ReactNode;
    color?: string;
    size?: "small" | "medium" | "large";
};

export const IconButton = React.forwardRef(
    (props: ButtonUnstyledProps & IconButtonProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
        const { children, color, size, ...rest } = props;
        return (
            <ButtonUnstyled
                {...rest}
                ref={ref}
                slotProps={{
                    root: {
                        className: resolveClassNames(
                            color || "text-gray-600",
                            "hover:bg-gray-200",
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
        );
    }
);

IconButton.displayName = "IconButton";
