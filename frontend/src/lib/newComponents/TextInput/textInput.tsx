import React from "react";

import { Input, type InputProps as InputBaseProps } from "@base-ui/react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type TextInputProps = Omit<InputBaseProps, "className"> & {
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(props, ref) {
    return (
        <div
            className={resolveClassNames(
                "gap-vertical-xs bg-canvas py-vertical-3xs px-vertical-xs text-body-lg data-invalid:outline-danger data-invalid:bg-danger-surface flex items-center",
                {
                    "form-element outline-neutral text-neutral outline -outline-offset-2": !props.disabled,
                    "text-disabled bg-disabled": props.disabled,
                },
            )}
        >
            {props.startAdornment}

            <Input
                {...props}
                ref={ref}
                className={resolveClassNames("grow p-0 outline-0 data-disabled:cursor-not-allowed")}
                disabled={props.disabled}
            />

            {props.endAdornment}
        </div>
    );
});
