import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";
import { Clear } from "@mui/icons-material";

import { ComboboxInput } from "./_input";

export type ComboboxValueChipsInputProps<TValue> = {
    placeholder?: string;
    getLabelForValue: (value: TValue) => string;
    renderItemAdornment?: (item: TValue) => React.ReactNode;
    children?: React.ReactNode;
};

export function ComboboxValueChipsInputComponent<TValue>(
    props: ComboboxValueChipsInputProps<TValue>,
    ref: React.ForwardedRef<HTMLInputElement>,
): React.ReactNode {
    return (
        <ComboboxBase.Chips className="gap-x-3xs gap-y-3xs flex w-full grow flex-wrap items-center">
            <ComboboxBase.Value>
                {(value) => (
                    <>
                        {Array.isArray(value) &&
                            value.map((item) => {
                                const label = props.getLabelForValue(item as unknown as TValue);
                                const key = String(item);
                                return (
                                    <ComboboxBase.Chip
                                        key={key}
                                        aria-label={label}
                                        className="gap-x-3xs bg-neutral text-neutral-strong data-highlighted:bg-accent-hover data-highlighted:outline-focus not-data-highlighted:hover:outline-accent focus-within:bg-accent-hover flex items-center overflow-hidden rounded outline-2 outline-offset-1 outline-transparent"
                                    >
                                        {props.renderItemAdornment && (
                                            <div className="pl-xs flex shrink-0 items-center">
                                                {props.renderItemAdornment(item)}
                                            </div>
                                        )}
                                        <span className="px-3xs flex items-center">{label}</span>
                                        <ComboboxBase.ChipRemove
                                            aria-label={`Remove ${label}`}
                                            className="selectable text-body-xs py-0"
                                        >
                                            <Clear />
                                        </ComboboxBase.ChipRemove>
                                    </ComboboxBase.Chip>
                                );
                            })}
                        <ComboboxInput ref={ref} placeholder={value.length > 0 ? "" : props.placeholder} />
                    </>
                )}
            </ComboboxBase.Value>
        </ComboboxBase.Chips>
    );
}

export const ComboboxValueChipsInput = React.forwardRef(ComboboxValueChipsInputComponent) as <TValue>(
    props: ComboboxValueChipsInputProps<TValue> & React.RefAttributes<HTMLInputElement>,
) => React.ReactNode;
