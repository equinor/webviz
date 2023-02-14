import React from "react";

import { InputUnstyled, InputUnstyledProps } from "@mui/base";

export const Input = React.forwardRef((props: InputUnstyledProps, ref: React.ForwardedRef<HTMLInputElement>) => {
    const { startAdornment, endAdornment, ...other } = props;

    const internalRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle<HTMLInputElement | null, HTMLInputElement | null>(ref, () => internalRef.current);

    const handleAdornmentClick = React.useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (internalRef.current) {
            internalRef.current.focus();
            internalRef.current.getElementsByTagName("input")[0].focus();
        }
        event.stopPropagation();
    }, []);

    return (
        <div className="flex gap-2 bg-white border border-gray-300 rounded shadow-sm focus:border-indigo-500 w-full sm:text-sm p-1 outline-none cursor-text">
            {startAdornment && (
                <div className="flex items-center" onClick={handleAdornmentClick}>
                    {startAdornment}
                </div>
            )}
            <InputUnstyled
                {...other}
                ref={internalRef}
                slotProps={{
                    root: {
                        className: "grow",
                    },
                    input: {
                        className: "focus:border-indigo-500 block w-full sm:text-sm border-gray-300 outline-none",
                    },
                }}
            />
            {endAdornment && (
                <div className="flex items-center" onClick={handleAdornmentClick}>
                    {endAdornment}
                </div>
            )}
        </div>
    );
});

Input.displayName = "Input";
