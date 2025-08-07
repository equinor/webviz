import { Input } from "@lib/components/Input";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import type { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import type { SettingCategory } from "../settingsDefinitions";

type ValueType = number | null;

type StaticProps = { min?: number; max?: number };

export class InputNumberSetting implements CustomSettingImplementation<ValueType, SettingCategory.NUMBER> {
    private _staticProps: StaticProps | null;

    constructor(props: StaticProps) {
        if (props && !!props.min && !!props.max && props.min > props.max) {
            throw new Error("Min value cannot be greater than max value ");
        }

        this._staticProps = props ?? null;
    }

    getIsStatic(): boolean {
        // If minMax is provided in constructor, the setting is defined as static
        return this._staticProps !== null;
    }

    isValueValid(
        value: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.NUMBER>,
    ): boolean {
        // If static limits are provided, Input component limits the value
        // i.e. no need to run fixupValue()
        if (this._staticProps) {
            return true;
        }

        const min = availableValues[0];
        const max = availableValues[1];

        if (value === null || value > max || value < min) {
            return false;
        }

        return true;
    }

    fixupValue(
        currentValue: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<
            ValueType,
            SettingCategory.NUMBER | SettingCategory.NUMBER_WITH_STEP
        >,
    ): ValueType {
        // If static limits are provided, return value as Input component controls the value
        if (this._staticProps) {
            return currentValue;
        }

        const min = availableValues[0];
        const max = availableValues[1];

        if (currentValue === null || currentValue < min) {
            return min;
        }
        if (currentValue > max) {
            return max;
        }

        return currentValue;
    }

    makeComponent(): (
        props: SettingComponentProps<ValueType, SettingCategory.NUMBER | SettingCategory.NUMBER_WITH_STEP>,
    ) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticProps = this._staticProps;

        return function InputNumberSetting(
            props: SettingComponentProps<ValueType, SettingCategory.NUMBER | SettingCategory.NUMBER_WITH_STEP>,
        ) {
            const min = isStatic ? staticProps?.min : props.availableValues?.[0];
            const max = isStatic ? staticProps?.max : props.availableValues?.[1];

            function handleInputChange(value: string) {
                props.onValueChange(Number(value));
            }

            return (
                <Input
                    type="number"
                    value={!props.isOverridden ? (props.value ?? min) : props.overriddenValue}
                    min={min}
                    max={max}
                    debounceTimeMs={200}
                    onValueChange={handleInputChange}
                />
            );
        };
    }
}
