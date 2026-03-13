import type React from "react";

import type { DropdownOptionOrGroup } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { assertStringOrNull } from "../utils/structureValidation";

import {
    fixupValue,
    isValueValid,
    makeValueConstraintsIntersectionReducerDefinition,
} from "./_shared/arraySingleSelect";

export enum Representation {
    OBSERVATION = "Observation",
    OBSERVATION_PER_REALIZATION = "Observation Per Realization",
    REALIZATION = "Realization",
    ENSEMBLE_STATISTICS = "Ensemble Statistics",
}
type ValueType = Representation | null;
type ValueConstraintsType = Representation[];

export class RepresentationSetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    private _staticOptions: DropdownOptionOrGroup<ValueType>[] | null = null;
    valueConstraintsIntersectionReducerDefinition =
        makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>();

    constructor(props?: { options?: ValueType[] | DropdownOptionOrGroup<ValueType>[] }) {
        if (!props?.options) return;

        const options = props.options;

        this._staticOptions = options.map((opt) => {
            if (opt === null) return { label: "None", value: null };
            if (typeof opt === "string") return { label: opt, value: opt };
            return opt;
        });
    }

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        assertStringOrNull(parsed);
        return parsed as ValueType;
    }

    getIsStatic(): boolean {
        return this._staticOptions !== null;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        return isValueValid<Representation, Representation>(value, valueConstraints, (v) => v);
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<Representation, Representation>(currentValue, valueConstraints, (v) => v);
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        const isStatic = this.getIsStatic();
        const staticOptions = this._staticOptions;

        return function RepresentationSetting(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
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
