import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import { ComboboxInput } from "./_input";

export type ComboboxSingleValueInputProps<TValue> = {
    renderItemAdornment?: (value: TValue) => React.ReactNode;
    placeholder?: string;
    children?: React.ReactNode;
};

function ComboboxSingleValueInputComponent<TValue>(
    props: ComboboxSingleValueInputProps<TValue>,
    ref: React.ForwardedRef<HTMLInputElement>,
): React.ReactNode {
    return (
        <>
            {props.renderItemAdornment && (
                <ComboboxBase.Value>
                    {(value: TValue) => {
                        if (value == null) return null;
                        return <div className="flex min-w-0 items-center">{props.renderItemAdornment!(value)}</div>;
                    }}
                </ComboboxBase.Value>
            )}
            <ComboboxInput ref={ref} placeholder={props.placeholder} />
        </>
    );
}

export const ComboboxSingleValueInput = React.forwardRef(ComboboxSingleValueInputComponent) as <TValue>(
    props: ComboboxSingleValueInputProps<TValue> & React.RefAttributes<HTMLInputElement>,
) => React.ReactNode;
