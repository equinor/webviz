import React from "react";

import { RadioGroup } from "@lib/components/Radio";
import { RadioCompositions } from "@lib/components/Radio/compositions";

export type NamedRadioGroupProps<TValue extends string> = {
    value: TValue;
    options: { value: TValue; label: string }[];
    onValueChange: (value: TValue) => void;
};

/**
 * Horizontal radio group whose options are named by their own labels. Inside a setting field the
 * shared composition names every option after the field label; the group keeps that field name.
 */
export function NamedRadioGroup<TValue extends string>(props: NamedRadioGroupProps<TValue>): React.ReactNode {
    const idPrefix = React.useId();

    return (
        <RadioGroup
            value={props.value}
            onValueChange={(value) => props.onValueChange(value as TValue)}
            layoutClassName="flex flex-row"
        >
            {props.options.map((option) => {
                const labelId = `${idPrefix}-${option.value}`;
                return (
                    <RadioCompositions.WithLabel
                        key={option.value}
                        value={option.value}
                        size="small"
                        aria-labelledby={labelId}
                    >
                        <span id={labelId}>{option.label}</span>
                    </RadioCompositions.WithLabel>
                );
            })}
        </RadioGroup>
    );
}
