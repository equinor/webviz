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
                "gap-space-xs bg-fill-canvas py-space-xs px-space-sm text-body-lg data-invalid:outline-stroke-danger data-invalid:bg-fill-danger-subtle flex items-center",
                {
                    "form-element outline-stroke-neutral text-text-neutral outline -outline-offset-2": !props.disabled,
                    "text-text-disabled cursor-not-allowed outline-transparent": props.disabled,
                },
            )}
        >
            {props.startAdornment}

            <Input {...props} ref={ref} className={resolveClassNames("grow p-0 outline-0")} disabled={props.disabled} />

            {props.endAdornment}
        </div>
    );
});
