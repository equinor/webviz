import type { ChangeEvent } from "react";
import type React from "react";

import { Input } from "@lib/components/Input";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = number | null;
type SteppedNumberSettingCompProps = SettingComponentProps<ValueType, SettingCategory.NUMBER_WITH_STEP>;

export class NumberSetting implements CustomSettingImplementation<ValueType, SettingCategory.NUMBER_WITH_STEP> {
    private _min?: number;
    private _max?: number;

    constructor(props: { minMax?: [number?, number?] }) {
        this._min = props.minMax?.[0] ?? undefined;
        this._max = props.minMax?.[1] ?? undefined;
    }

    isValueValid(): boolean {
        return true;
    }

    getIsStatic(): boolean {
        return true;
    }

    makeComponent(): (props: SteppedNumberSettingCompProps) => React.ReactNode {
        const minValue = this._min;
        const maxValue = this._max;

        return function BooleanSwitch(props: SteppedNumberSettingCompProps) {
            function handleChange(e: ChangeEvent<HTMLInputElement>) {
                props.onValueChange(e.target.valueAsNumber ?? null);
            }

            return <Input value={props.value} min={minValue} max={maxValue} type="number" onChange={handleChange} />;
        };
    }

    serializeValue(value: ValueType): string {
        if (!value) return "";
        return String(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        if (serializedValue === "") return null;
        return Number(serializedValue);
    }
}
