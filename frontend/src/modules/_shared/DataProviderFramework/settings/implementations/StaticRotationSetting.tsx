import React from "react";

import { Input } from "@lib/components/Input";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = number | null;

export type StaticRotationSettingProps = {
    minMax?: [number, number];
    step?: number;
    loopAround?: boolean;
};

export class StaticRotationSetting implements CustomSettingImplementation<ValueType, SettingCategory.NUMBER_WITH_STEP> {
    defaultValue = 0;
    private _min: number;
    private _max: number;
    private _step: number;
    private loopAround: boolean;

    constructor(props: StaticRotationSettingProps) {
        this._min = props?.minMax?.[0] ?? -180;
        this._max = props?.minMax?.[1] ?? 180;
        this._step = props?.step ?? 45;
        this.loopAround = props?.loopAround ?? true;
    }

    getIsStatic() {
        return true;
    }

    fixupValue(v: ValueType) {
        if (v == null) return 0;
        return v;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.NUMBER_WITH_STEP>) => React.ReactNode {
        const min = this._min;
        const max = this._max;
        const step = this._step;
        const loopAround = this.loopAround;

        return function DropdownStringSetting(
            props: SettingComponentProps<ValueType, SettingCategory.NUMBER_WITH_STEP>,
        ) {
            const { onValueChange } = props;
            const value = props.isOverridden ? props.overriddenValue : props.value;

            const handleInputChange = React.useCallback(
                function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
                    let newVal = event.target.valueAsNumber;

                    if (loopAround && newVal < min) {
                        const diff = min - newVal;
                        newVal = max - diff;
                    }

                    if (loopAround && newVal > max) {
                        const diff = newVal - max;
                        newVal = min + diff;
                    }

                    onValueChange(newVal);
                },
                [onValueChange],
            );

            return (
                <Input
                    value={value}
                    type="number"
                    disabled={props.isOverridden}
                    min={loopAround ? undefined : min}
                    max={loopAround ? undefined : max}
                    step={step}
                    onChange={handleInputChange}
                    className="grow"
                />
            );
        };
    }
}
