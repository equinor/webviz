import React from "react";

import { Slider } from "@lib/components/Slider";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";
import { Input } from "@lib/components/Input";
import { isEqual } from "lodash";

type ValueType = [number, number] | null;

export enum Direction {
    I,
    J,
    K,
}

export class GridLayerRangeSetting implements CustomSettingImplementation<ValueType, SettingCategory.RANGE> {
    defaultValue: ValueType = null;

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

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.RANGE>) => React.ReactNode {
        return function RangeSlider(props: SettingComponentProps<ValueType, SettingCategory.RANGE>) {
            const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
            const [internalValue, setInternalValue] = React.useState<ValueType>(props.value);
            const [prevValue, setPrevValue] = React.useState<ValueType>(props.value);

            if (!isEqual(prevValue, props.value)) {
                setInternalValue(props.value);
                setPrevValue(props.value);
            }

            React.useEffect(function handleMount() {
                return function handleUnmount() {
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                };
            }, []);

            function handleChange(_: any, value: number | number[]) {
                if (!Array.isArray(value)) {
                    return;
                }

                setInternalValue([value[0], value[1]]);

                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => props.onValueChange([value[0], value[1]]), 500);
            }

            return (
                <div className="flex flex-row gap-2">
                    <div className="flex-1 min-w-16">
                        <Input
                            type="number"
                            value={internalValue?.[0] ?? 0}
                            onChange={(e) => handleChange(e, [Number(e.target.value), props.value?.[1] ?? 1])}
                        />
                    </div>
                    <div className="flex-4">
                        <Slider
                            min={props.availableValues?.[0] ?? 0}
                            max={props.availableValues?.[1] ?? 1}
                            onChange={handleChange}
                            value={internalValue ?? [props.availableValues?.[0] ?? 0, props.availableValues?.[1] ?? 1]}
                            valueLabelDisplay="auto"
                        />
                    </div>
                    <div className="flex-1 min-w-16">
                        <Input
                            type="number"
                            value={internalValue?.[1] ?? 1}
                            onChange={(e) => handleChange(e, [props.value?.[0] ?? 0, Number(e.target.value)])}
                        />
                    </div>
                </div>
            );
        };
    }
}
