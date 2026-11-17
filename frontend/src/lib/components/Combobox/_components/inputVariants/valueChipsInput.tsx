import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import { Chip } from "../../../Chip";
import { Tooltip } from "../../../Tooltip";

import { ComboboxInput } from "./_input";

export type ComboboxValueChipsInputProps<TValue> = {
    placeholder?: string;
    getLabelForValue: (value: TValue) => string;
    isValueAvailable: (value: TValue) => boolean;
    hasOnlyUnavailableValues: (value: unknown) => boolean;
    unavailableValueText: string;
    renderItemAdornment?: (item: TValue) => React.ReactNode;
    children?: React.ReactNode;
};

export function ComboboxValueChipsInputComponent<TValue>(
    props: ComboboxValueChipsInputProps<TValue>,
    ref: React.ForwardedRef<HTMLInputElement>,
): React.ReactNode {
    return (
        <ComboboxBase.Chips className="gap-x-3xs gap-y-3xs flex min-w-0 grow flex-wrap items-center">
            <ComboboxBase.Value>
                {(value) => (
                    <>
                        {Array.isArray(value) &&
                            value.map((item) => {
                                const label = props.getLabelForValue(item as unknown as TValue);
                                const isUnavailable = !props.isValueAvailable(item as unknown as TValue);
                                const key = String(item);
                                return (
                                    <ComboboxBase.Chip
                                        key={key}
                                        aria-label={isUnavailable ? `${label} (${props.unavailableValueText})` : label}
                                        render={(htmlProps, chipState) => (
                                            <Chip
                                                {...htmlProps}
                                                tone={isUnavailable ? "danger" : "neutral"}
                                                disabled={chipState.disabled}
                                                startAdornment={props.renderItemAdornment?.(item)}
                                                wrapRemoveButton={(btn) => <ComboboxBase.ChipRemove render={btn} />}
                                            >
                                                <Tooltip
                                                    content={isUnavailable ? props.unavailableValueText : undefined}
                                                >
                                                    <span className="line-clamp-2 min-w-0 flex-1">{label}</span>
                                                </Tooltip>
                                            </Chip>
                                        )}
                                    />
                                );
                            })}
                        <ComboboxInput
                            ref={ref}
                            placeholder={value.length > 0 ? "" : props.placeholder}
                            invalid={props.hasOnlyUnavailableValues(value)}
                        />
                    </>
                )}
            </ComboboxBase.Value>
        </ComboboxBase.Chips>
    );
}

export const ComboboxValueChipsInput = React.forwardRef(ComboboxValueChipsInputComponent) as <TValue>(
    props: ComboboxValueChipsInputProps<TValue> & React.RefAttributes<HTMLInputElement>,
) => React.ReactNode;
