import React from "react";

import type { ComboboxInputProps } from "@base-ui/react";
import { Combobox as ComboboxBase, mergeProps } from "@base-ui/react";

export type InputProps = ComboboxInputProps & {
    /** Marks the input invalid in addition to any Field validation state. Like Base UI, omitted while disabled. */
    invalid?: boolean;
};

function InputComponent(props: InputProps, ref: React.ForwardedRef<HTMLInputElement>): React.ReactNode {
    const { invalid, ...inputProps } = props;

    const mergedProps = mergeProps(
        {
            className: "box-border min-w-8 flex-1 w-full border-0 bg-transparent focus:outline-0",
        },
        inputProps,
    );

    return (
        <ComboboxBase.Input
            ref={ref}
            {...mergedProps}
            render={(htmlProps, state) => (
                <input
                    {...htmlProps}
                    aria-invalid={htmlProps["aria-invalid"] || (invalid && !state.disabled) || undefined}
                />
            )}
        />
    );
}

export const ComboboxInput = React.forwardRef(InputComponent);
