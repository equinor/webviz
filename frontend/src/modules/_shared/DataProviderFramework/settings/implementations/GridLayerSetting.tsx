import type React from "react";

import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

export enum Direction {
    I,
    J,
    K,
}

type ValueType = number | null;
type ValueRange = [number, number];

export class GridLayerSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRange> {
    defaultValue: ValueType = null;
    valueRangeIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRange, valueRange: ValueRange) => {
            if (accumulator === null) {
                return valueRange;
            }

            const min = Math.max(accumulator[0], valueRange[0]);
            const max = Math.min(accumulator[1], valueRange[1]);

            return [min, max] as ValueRange;
        },
        startingValue: null,
        isValid: (valueRange: ValueRange): boolean => {
            return valueRange[0] <= valueRange[1];
        },
    };

    private _direction: Direction;

    constructor(direction: Direction) {
        this._direction = direction;
    }

    getLabel(): string {
        switch (this._direction) {
            case Direction.I:
                return "Grid layer I";
            case Direction.J:
                return "Grid layer J";
            case Direction.K:
                return "Grid layer K";
        }
    }

    isValueValid(value: ValueType, valueRange: ValueRange): boolean {
        if (value === null) {
            return false;
        }

        if (!valueRange) {
            return false;
        }

        const min = valueRange[0];
        const max = valueRange[1];

        if (max === null || min === null) {
            return false;
        }

        return value >= min && value <= max;
    }

    fixupValue(currentValue: ValueType, valueRange: ValueRange): ValueType {
        if (!valueRange) {
            return null;
        }

        const min = valueRange[0];
        const max = valueRange[1];

        if (max === null || min === null) {
            return null;
        }

        if (currentValue === null) {
            return min;
        }

        if (currentValue < min) {
            return min;
        }

        if (currentValue > max) {
            return max;
        }

        return currentValue;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRange>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType, ValueRange>) {
            const start = props.valueRange?.[0] ?? 0;
            const end = props.valueRange?.[1] ?? 0;

            const rangeSize = end - start;

            const options: DropdownOption[] = Array.from({ length: rangeSize }, (_, index) => {
                const value = start + index;
                return {
                    value: value.toString(),
                    label: value.toString(),
                };
            });

            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={(val: string) => props.onValueChange(parseInt(val))}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
