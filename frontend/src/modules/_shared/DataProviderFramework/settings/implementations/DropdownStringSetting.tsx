import type React from "react";

import type { DropdownOptionOrGroup } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { isStringOrNull } from "../utils/structureValidation";

import { fixupValue, isValueValid, makeValueConstraintsIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

type ValueType = string | null;
type ValueConstraintsType = string[];

export class DropdownStringSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    private _staticOptions: DropdownOptionOrGroup<ValueType>[] | null = null;
    valueConstraintsIntersectionReducerDefinition = makeValueConstraintsIntersectionReducerDefinition<string[]>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        return isStringOrNull(value);
    }

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

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<string, string>(value, valueConstraints, (v) => v);
    }

    fixupValue(value: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<string, string>(value, valueConstraints, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticOptions = this._staticOptions;

        return function DropdownStringSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            let options: DropdownOptionOrGroup<ValueType>[];

            if (isStatic && staticOptions) {
                options = staticOptions;
            } else if (!isStatic && props.valueConstraints) {
                options = props.valueConstraints.map((value) => ({
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
