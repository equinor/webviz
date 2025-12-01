import type React from "react";

import type { DropdownOptionOrGroup } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { fixupValue, isValueValid, makeValueRangeIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

type ValueType = string | null;
type ValueRangeType = string[];

export class DropdownStringSetting implements CustomSettingImplementation<ValueType, ValueType, ValueRangeType> {
    private _staticOptions: DropdownOptionOrGroup<ValueType>[] | null = null;
    valueRangeIntersectionReducerDefinition = makeValueRangeIntersectionReducerDefinition<string[]>();

    constructor(props?: { options?: ValueType[] | DropdownOptionOrGroup<ValueType>[] }) {
        if (!props?.options) return;

        const options = props.options;

        this._staticOptions = options.map((opt) => {
            if (opt === null) return { label: "None", value: null };
            if (typeof opt === "string") return { label: opt, value: opt };
            return opt;
        });
    }

    getIsStatic(): boolean {
        return this._staticOptions !== null;
    }

    isValueValid(value: ValueType, valueRange: ValueRangeType): boolean {
        return isValueValid<string, string>(value, valueRange, (v) => v);
    }

    fixupValue(value: ValueType, valueRange: ValueRangeType): ValueType {
        return fixupValue<string, string>(value, valueRange, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueRangeType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticOptions = this._staticOptions;

        return function DropdownStringSetting(props: SettingComponentProps<ValueType, ValueRangeType>) {
            let options: DropdownOptionOrGroup<ValueType>[];

            if (isStatic && staticOptions) {
                options = staticOptions;
            } else if (!isStatic && props.valueRange) {
                options = props.valueRange.map((value) => ({
                    value: value,
                    label: value === null ? "None" : value,
                }));
            } else {
                options = [];
            }

            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value : props.overriddenValue}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
