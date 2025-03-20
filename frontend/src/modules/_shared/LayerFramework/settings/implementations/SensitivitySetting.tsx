import React from "react";

import { Dropdown } from "@lib/components/Dropdown";

import {
    CustomSettingImplementation,
    SettingComponentProps,
} from "../../interfacesAndTypes/customSettingImplementation";
import { MakeAvailableValuesTypeBasedOnCategory } from "../../interfacesAndTypes/utils";
import { SettingCategory } from "../settingsDefinitions";

export type SensitivityNameCasePair = {
    sensitivityName: string;
    sensitivityCase: string;
};

type ValueType = SensitivityNameCasePair | null;
export class SensitivitySetting implements CustomSettingImplementation<ValueType, SettingCategory.SINGLE_OPTION> {
    isValueValid(
        value: ValueType,
        availableValues: MakeAvailableValuesTypeBasedOnCategory<ValueType, SettingCategory.SINGLE_OPTION>
    ): boolean {
        if (availableValues.length === 0) {
            return true;
        }
        if (!value) {
            return false;
        }
        return availableValues
            .filter((el) => el !== null)
            .some(
                (sensitivity) =>
                    sensitivity?.sensitivityName === value.sensitivityName &&
                    sensitivity?.sensitivityCase === value.sensitivityCase
            );
    }

    makeComponent(): (props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) => React.ReactNode {
        return function Sensitivity(props: SettingComponentProps<ValueType, SettingCategory.SINGLE_OPTION>) {
            const availableValues = props.availableValues ?? [];

            const availableSensitivityNames: string[] = [
                ...Array.from(new Set(availableValues.map((sensitivity) => sensitivity.sensitivityName))),
            ];

            const currentSensitivityName = props.value?.sensitivityName;
            const availableSensitiveCases = availableValues
                .filter((sensitivity) => sensitivity.sensitivityName === currentSensitivityName)
                .map((sensitivity) => sensitivity.sensitivityCase);

            const currentSensitivityCase = fixupSensitivityCase(
                props.value?.sensitivityCase || null,
                availableSensitiveCases
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
                const availableSensitiveCases = availableValues
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
            if (availableValues.length === 0) {
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
