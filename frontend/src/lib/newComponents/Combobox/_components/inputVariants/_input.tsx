import React from "react";

import type { ComboboxInputProps } from "@base-ui/react";
import { Combobox as ComboboxBase, mergeProps } from "@base-ui/react";

export type InputProps = ComboboxInputProps;

function InputComponent(props: InputProps, ref: React.ForwardedRef<HTMLInputElement>): React.ReactNode {
    const mergedProps = mergeProps(
        {
            className: "box-border min-w-8 flex-1 w-full border-0 bg-transparent focus:outline-0",
        },
        props,
    );

    return <ComboboxBase.Input ref={ref} {...mergedProps} />;
}

export const ComboboxInput = React.forwardRef(InputComponent);
