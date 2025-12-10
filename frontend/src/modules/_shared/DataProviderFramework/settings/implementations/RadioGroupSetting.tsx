import { RadioGroup } from "@lib/components/RadioGroup";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = string | null;
type ValueRangeType = { value: string; label: string }[] | null;

export class RadioGroupSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    private _staticOptions: ValueRangeType;
    private _layout: "horizontal" | "vertical";

    valueRangeIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueRange: ValueRangeType, index: number) => {
            if (index === 0) {
                return valueRange;
            }

            if (accumulator === null || valueRange === null) {
                return null;
            }

            return accumulator.filter((option) => valueRange.includes(option));
        },
        startingValue: null,
        isValid: (valueRange: ValueRangeType): boolean => {
            return Array.isArray(valueRange) && valueRange.length > 0;
        },
    };

    constructor(props: { staticOptions?: { value: string; label: string }[]; layout?: "horizontal" | "vertical" }) {
        this._staticOptions = props.staticOptions ?? null;
        this._layout = props.layout ?? "vertical";
    }

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return typeof value === "string" || value === null;
    }

    getIsStatic(): boolean {
        // If static options are provided in constructor, the setting is defined as static
        return this._staticOptions !== null;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticProps = this._staticOptions;
        const layout = this._layout;

        return function RadioGroupSettingComponent(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const options = isStatic ? staticProps : (props.valueRange ?? [{ value: "", label: "" }]);

            return (
                <div className="flex h-8 items-center">
                    <RadioGroup
                        options={options ?? []}
                        value={props.value ?? options![0].value}
                        onChange={(_, v) => props.onValueChange(v)}
                        direction={layout}
                    />
                </div>
            );
        };
    }
}
