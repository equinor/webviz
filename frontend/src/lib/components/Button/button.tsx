import React from "react";

import { ButtonUnstyled, ButtonUnstyledProps } from "@mui/base";

import { BaseComponent } from "../_BaseComponent";

export const Button = React.forwardRef((props: ButtonUnstyledProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const { disabled, ...rest } = props;
    return (
        <BaseComponent disabled={disabled}>
            <ButtonUnstyled
                {...rest}
                ref={ref}
                slotProps={{
                    root: {
                        className:
                            "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                    },
                }}
            />
        </BaseComponent>
    );
});

Button.displayName = "Button";
