import type React from "react";

import { Dropdown } from "@lib/components/Dropdown";

import type {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";

import { fixupValue, makeValueConstraintsIntersectionReducerDefinition } from "./_shared/arraySingleSelect";

export type SensitivityNameCasePair = {
    sensitivityName: string;
    sensitivityCase: string;
};

type ValueType = SensitivityNameCasePair | null;
type ValueConstraintsType = SensitivityNameCasePair[];
export class SensitivitySetting implements CustomSettingImplementation<ValueType, ValueType, ValueConstraintsType> {
    valueConstraintsIntersectionReducerDefinition = makeValueConstraintsIntersectionReducerDefinition<ValueConstraintsType>();

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);

        if (parsed === null) {
            return null;
        }

        if (typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Expected object or null");
        }

        const v = parsed as Record<string, unknown>;
        if (typeof v.sensitivityName !== "string" || typeof v.sensitivityCase !== "string") {
            throw new Error("Expected object with string properties: sensitivityName, sensitivityCase");
        }

        return parsed as ValueType;
    }

    isValueValid(value: ValueType, valueConstraints: ValueConstraintsType): boolean {
        if (valueConstraints.length === 0) {
            return true;
        }
        if (!value) {
            return false;
        }
        return valueConstraints
            .filter((el) => el !== null)
            .some(
                (sensitivity) =>
                    sensitivity?.sensitivityName === value.sensitivityName &&
                    sensitivity?.sensitivityCase === value.sensitivityCase,
            );
    }

    fixupValue(currentValue: ValueType, valueConstraints: ValueConstraintsType): ValueType {
        return fixupValue<SensitivityNameCasePair, SensitivityNameCasePair>(
            currentValue,
            valueConstraints,
            (v) => v,
            (a, b) => a.sensitivityName === b.sensitivityName && a.sensitivityCase === b.sensitivityCase,
        );
    }

    makeComponent(): (props: SettingComponentProps<ValueType, ValueConstraintsType>) => React.ReactNode {
        return function Sensitivity(props: SettingComponentProps<ValueType, ValueConstraintsType>) {
            const valueConstraints = props.valueConstraints ?? [];

            const availableSensitivityNames: string[] = [
                ...Array.from(new Set(valueConstraints.map((sensitivity) => sensitivity.sensitivityName))),
            ];

            const currentSensitivityName = props.value?.sensitivityName;
            const availableSensitiveCases = valueConstraints
                .filter((sensitivity) => sensitivity.sensitivityName === currentSensitivityName)
                .map((sensitivity) => sensitivity.sensitivityCase);

            const currentSensitivityCase = fixupSensitivityCase(
                props.value?.sensitivityCase || null,
                availableSensitiveCases,
            );

            const sensitivityNameOptions = availableSensitivityNames.map((sensitivityName) => ({
                value: sensitivityName,
                label: sensitivityName,
            }));

            const sensitivityCaseOptions = availableSensitiveCases.map((sensitivityCase) => ({
                value: sensitivityCase,
                label: sensitivityCase,
            }));

            if (!currentSensitivityName || !currentSensitivityCase) {
                props.onValueChange(null);
            } else if (currentSensitivityCase !== props.value?.sensitivityCase) {
                props.onValueChange({
                    sensitivityName: currentSensitivityName,
                    sensitivityCase: currentSensitivityCase,
                });
            }

            function handleSensitivityNameChange(selectedValue: string) {
                const availableSensitiveCases = valueConstraints
                    .filter((sensitivity) => sensitivity.sensitivityName === selectedValue)
                    .map((sensitivity) => sensitivity.sensitivityCase);

                const currentSensitivityCase = fixupSensitivityCase(null, availableSensitiveCases);
                if (!currentSensitivityCase) {
                    props.onValueChange(null);
                } else {
                    props.onValueChange({
                        sensitivityName: selectedValue,
                        sensitivityCase: currentSensitivityCase,
                    });
                }
            }
            function handleSensitivityCaseChange(selectedValue: string) {
                props.onValueChange({
                    sensitivityName: props.value?.sensitivityName ?? "",
                    sensitivityCase: selectedValue,
                });
            }
            if (valueConstraints.length === 0) {
                return "No sensitivities available";
            }
            return (
                <div className="flex">
                    <Dropdown
                        options={sensitivityNameOptions}
                        value={props.value?.sensitivityName ?? ""}
                        onChange={handleSensitivityNameChange}
                    />
                    <Dropdown
                        options={sensitivityCaseOptions}
                        value={currentSensitivityCase ?? ""}
                        onChange={handleSensitivityCaseChange}
                    />
                </div>
            );
        };
    }
}

function fixupSensitivityCase(currentSensitivityCase: string | null, availableSensitiveCases: string[]): string | null {
    if (!currentSensitivityCase || !availableSensitiveCases.includes(currentSensitivityCase)) {
        return availableSensitiveCases[0] ?? null;
    }

    return currentSensitivityCase;
}
