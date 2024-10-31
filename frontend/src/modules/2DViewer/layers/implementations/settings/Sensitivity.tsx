import React from "react";

import { Dropdown } from "@lib/components/Dropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { AvailableValuesType, Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

export type SensitivityNameCasePair = {
    sensitivityName: string;
    sensitivityCase: string;
};

export class Sensitivity implements Setting<SensitivityNameCasePair | null> {
    private _delegate: SettingDelegate<SensitivityNameCasePair | null>;

    constructor() {
        this._delegate = new SettingDelegate<SensitivityNameCasePair | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.STATISTIC_FUNCTION;
    }

    getLabel(): string {
        return "Sensitivity";
    }

    getDelegate(): SettingDelegate<SensitivityNameCasePair | null> {
        return this._delegate;
    }

    isValueValid(
        availableValues: AvailableValuesType<SensitivityNameCasePair | null>,
        value: SensitivityNameCasePair | null
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

    makeComponent(): (props: SettingComponentProps<SensitivityNameCasePair | null>) => React.ReactNode {
        return function Sensitivity(props: SettingComponentProps<SensitivityNameCasePair | null>) {
            const availableSensitivityNames: string[] = [
                ...Array.from(new Set(props.availableValues.map((sensitivity) => sensitivity.sensitivityName))),
            ];

            const currentSensitivityName = props.value?.sensitivityName;
            const availableSensitiveCases = props.availableValues
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
                const availableSensitiveCases = props.availableValues
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
            if (props.availableValues.length === 0) {
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
