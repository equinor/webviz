import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import type { ComboboxItem } from "../../types";

import { ComboboxInput } from "./_input";

export type ValueCountProps<TValue> = {
    flatItems: ComboboxItem<TValue>[];
    placeholder?: string;
    children?: React.ReactNode;
};

function ComboboxValueCountInputComponent<TValue>(
    props: ValueCountProps<TValue>,
    ref: React.ForwardedRef<HTMLInputElement>,
): React.ReactNode {
    return (
        <div className="min-w-0 grow">
            <ComboboxBase.Value>
                {(value) => (
                    <ComboboxInput
                        ref={ref}
                        data-has-selection={Array.isArray(value) && value.length > 0 ? "" : undefined}
                        className="data-has-selection:placeholder:text-neutral-strong!"
                        placeholder={
                            Array.isArray(value) && value.length > 0
                                ? `${value.length}/${props.flatItems.length} selected`
                                : props.placeholder
                        }
                    />
                )}
            </ComboboxBase.Value>
        </div>
    );
}

export const ComboboxValueCountInput = React.forwardRef(ComboboxValueCountInputComponent) as <TValue>(
    props: ValueCountProps<TValue> & React.RefAttributes<HTMLInputElement>,
) => React.ReactNode;
