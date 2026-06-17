import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import { Chip } from "../../../Chip/chip";

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
                                        render={(htmlProps, chipState) => (
                                            <Chip
                                                {...htmlProps}
                                                tone="neutral"
                                                disabled={chipState.disabled}
                                                startAdornment={props.renderItemAdornment?.(item)}
                                                wrapRemoveButton={(btn) => <ComboboxBase.ChipRemove render={btn} />}
                                            >
                                                <span className="line-clamp-2">{label}</span>
                                            </Chip>
                                        )}
                                    />
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
