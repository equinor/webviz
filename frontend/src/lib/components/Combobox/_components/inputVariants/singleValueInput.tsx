import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import { Tooltip } from "../../../Tooltip";

import { ComboboxInput } from "./_input";

export type ComboboxSingleValueInputProps<TValue> = {
    isValueAvailable: (value: TValue) => boolean;
    hasOnlyUnavailableValues: (value: unknown) => boolean;
    unavailableValueText: string;
    renderItemAdornment?: (value: TValue) => React.ReactNode;
    placeholder?: string;
    children?: React.ReactNode;
};

function ComboboxSingleValueInputComponent<TValue>(
    props: ComboboxSingleValueInputProps<TValue>,
    ref: React.ForwardedRef<HTMLInputElement>,
): React.ReactNode {
    return (
        <ComboboxBase.Value>
            {(value: TValue) => {
                const isUnavailable = value != null && !props.isValueAvailable(value);
                return (
                    <>
                        {props.renderItemAdornment && value != null && (
                            <div className="flex min-w-0 items-center">{props.renderItemAdornment(value)}</div>
                        )}
                        {/* Wrapper is always rendered so the input is not remounted (losing focus) when availability changes */}
                        <Tooltip content={isUnavailable ? props.unavailableValueText : undefined}>
                            <div className="flex min-w-0 flex-1">
                                <ComboboxInput
                                    ref={ref}
                                    placeholder={props.placeholder}
                                    data-unavailable={isUnavailable ? "" : undefined}
                                    aria-description={isUnavailable ? props.unavailableValueText : undefined}
                                    invalid={props.hasOnlyUnavailableValues(value)}
                                    className="data-unavailable:text-danger-subtle"
                                />
                            </div>
                        </Tooltip>
                    </>
                );
            }}
        </ComboboxBase.Value>
    );
}

export const ComboboxSingleValueInput = React.forwardRef(ComboboxSingleValueInputComponent) as <TValue>(
    props: ComboboxSingleValueInputProps<TValue> & React.RefAttributes<HTMLInputElement>,
) => React.ReactNode;
