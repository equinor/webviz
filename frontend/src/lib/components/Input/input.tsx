import React from "react";

import { InputUnstyled, InputUnstyledProps } from "@mui/base";

export const Input = React.forwardRef((props: InputUnstyledProps, ref: React.ForwardedRef<HTMLInputElement>) => {
    return (
        <InputUnstyled
            {...props}
            ref={ref}
            slotProps={{
                root: {
                    className:
                        "bg-white border border-gray-300 rounded shadow-sm focus:border-indigo-500 block w-full sm:text-sm p-1 outline-none",
                },
                input: {
                    className: "focus:border-indigo-500 block w-full sm:text-sm border-gray-300 outline-none",
                },
            }}
        />
    );
});

Input.displayName = "Input";
