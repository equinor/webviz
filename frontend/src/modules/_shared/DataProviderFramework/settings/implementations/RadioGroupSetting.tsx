import { RadioCompositions } from "@lib/newComponents/Radio/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

type ValueType = string | null;
type ValueRangeType = { value: string; label: string }[] | null;

export class RadioGroupSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    private _staticOptions: ValueRangeType;
    private _layout: "horizontal" | "vertical";
    defaultValue: ValueType;

    valueConstraintsIntersectionReducerDefinition = {
        reducer: (accumulator: ValueRangeType, valueConstraints: ValueRangeType, index: number) => {
            if (index === 0) {
                return valueConstraints;
            }

            if (accumulator === null || valueConstraints === null) {
                return null;
            }

            return accumulator.filter((option) => valueConstraints.includes(option));
        },
        startingValue: null,
        isValid: (valueConstraints: ValueRangeType): boolean => {
            return Array.isArray(valueConstraints) && valueConstraints.length > 0;
        },
    };

    constructor(props: { staticOptions?: { value: string; label: string }[]; layout?: "horizontal" | "vertical" }) {
        this._staticOptions = props.staticOptions ?? null;
        this._layout = props.layout ?? "vertical";
        this.defaultValue = props.staticOptions?.[0]?.value ?? null;
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

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        if (parsed !== null && typeof parsed !== "string") {
            throw new Error(`Expected string or null, got ${typeof parsed}`);
        }
        return parsed;
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticProps = this._staticOptions;
        const layout = this._layout;

        return function RadioGroupSettingComponent(props: SettingComponentProps<ValueType, ValueRangeType>) {
            const options = isStatic ? staticProps : (props.valueConstraints ?? [{ value: "", label: "" }]);

            return (
                <div className="flex h-8 items-center">
                    <RadioCompositions.GroupWithLabels
                        value={props.value}
                        onValueChange={(v) => props.onValueChange(v)}
                        layoutClassName={resolveClassNames("flex items-center", {
                            "flex-col": layout === "vertical",
                        })}
                        options={options ?? []}
                        layout="horizontal"
                        size="small"
                        disabled={props.disabled}
                    />
                </div>
            );
        };
    }
}
