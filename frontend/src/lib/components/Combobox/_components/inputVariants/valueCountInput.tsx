import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";

import { Tooltip } from "../../../Tooltip";
import type { ComboboxItem } from "../../types";

import { ComboboxInput } from "./_input";

export type ValueCountProps<TValue> = {
    flatItems: ComboboxItem<TValue>[];
    getLabelForValue: (value: TValue) => string;
    isValueAvailable: (value: TValue) => boolean;
    hasOnlyUnavailableValues: (value: unknown) => boolean;
    unavailableValueText: string;
    children?: React.ReactNode;
};

function ComboboxValueCountInputComponent<TValue>(
    props: ValueCountProps<TValue>,
    ref: React.ForwardedRef<HTMLInputElement>,
): React.ReactNode {
    return (
        <ComboboxBase.Value>
            {(value) => {
                const values: TValue[] = Array.isArray(value) ? value : [];
                const unavailableLabels = values
                    .filter((v) => !props.isValueAvailable(v))
                    .map((v) => props.getLabelForValue(v));
                const numAvailable = values.length - unavailableLabels.length;

                let countText = `${numAvailable}/${props.flatItems.length} selected`;
                let unavailableText: string | undefined = undefined;
                if (unavailableLabels.length > 0) {
                    countText += `, ${unavailableLabels.length} unavailable`;
                    unavailableText = `${props.unavailableValueText}: ${unavailableLabels.join(", ")}`;
                }

                return (
                    <Tooltip content={unavailableText}>
                        <div className="min-w-0 grow">
                            <ComboboxInput
                                ref={ref}
                                data-has-selection={values.length > 0 ? "" : undefined}
                                data-unavailable={unavailableText ? "" : undefined}
                                aria-description={unavailableText}
                                invalid={props.hasOnlyUnavailableValues(value)}
                                className="data-has-selection:placeholder:text-neutral-strong! data-unavailable:placeholder:text-danger-subtle!"
                                placeholder={countText}
                            />
                        </div>
                    </Tooltip>
                );
            }}
        </ComboboxBase.Value>
    );
}

export const ComboboxValueCountInput = React.forwardRef(ComboboxValueCountInputComponent) as <TValue>(
    props: ValueCountProps<TValue> & React.RefAttributes<HTMLInputElement>,
) => React.ReactNode;
