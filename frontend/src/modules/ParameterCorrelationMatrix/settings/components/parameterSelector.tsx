import React from "react";

import { ParameterIdent } from "@framework/EnsembleParameters";
import { Label } from "@lib/components/Label";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";

type ParametersSelectorProps = {
    allParameterIdentStrings: string[];
    selectedParameterStrings: string[];
    onChange: (selected: string[]) => void;
};

enum GroupType {
    NO_GROUP = "NO GROUP",
}

function ParametersSelector({
    allParameterIdentStrings,
    selectedParameterStrings,
    onChange,
}: ParametersSelectorProps): React.ReactNode {
    const [autoSelectAllOnGroupChange, setAutoSelectAllOnGroupChange] = React.useState<boolean>(false);

    const allParameterObjects: ParameterIdent[] = allParameterIdentStrings
        .map((s) => {
            return ParameterIdent.fromString(s);
        })
        .filter(Boolean) as ParameterIdent[];

    const [selectedGroupFilterValues, setSelectedGroupFilterValues] = React.useState<string[]>(() => {
        if (selectedParameterStrings.length > 0) {
            const initialParameterIdents = selectedParameterStrings.map((s) => ParameterIdent.fromString(s));
            return Array.from(new Set(initialParameterIdents.map((p) => p.groupName ?? GroupType.NO_GROUP)));
        }
        return [];
    });

    const selectedParameterObjects: ParameterIdent[] = selectedParameterStrings
        .map((s) => {
            return ParameterIdent.fromString(s);
        })
        .filter(Boolean) as ParameterIdent[];

    const allParameterGroupOptions: SelectOption[] = Array.from(
        new Set(allParameterObjects.map((p) => p.groupName ?? GroupType.NO_GROUP)),
    ).map((groupName) => ({
        label: groupName,
        value: groupName,
    }));

    const parameterOptions: SelectOption[] = allParameterObjects
        .filter((p) => {
            if (selectedGroupFilterValues.length === 0) {
                return false;
            }
            return selectedGroupFilterValues.some((groupValue) => groupValue === (p.groupName ?? GroupType.NO_GROUP));
        })
        .map((p) => ({
            label: p.name,
            value: p.toString(),
        }));

    const selectedParameterValuesForSelect: string[] = selectedParameterStrings;

    const handleGroupChange = (newlySelectedGroupFilterStrings: string[]) => {
        setSelectedGroupFilterValues(newlySelectedGroupFilterStrings);

        if (newlySelectedGroupFilterStrings.length === 0) {
            onChange([]);
        } else {
            const parametersThatMatchNewGroups = allParameterObjects.filter((p) =>
                newlySelectedGroupFilterStrings.some(
                    (groupValue) => groupValue === (p.groupName ?? GroupType.NO_GROUP),
                ),
            );

            let newSelectedParameters: ParameterIdent[] = [];

            if (autoSelectAllOnGroupChange) {
                newSelectedParameters = parametersThatMatchNewGroups;
            } else {
                newSelectedParameters = selectedParameterObjects.filter((p) =>
                    parametersThatMatchNewGroups.some((pg) => pg.equals(p)),
                );
            }

            onChange(newSelectedParameters.map((p) => p.toString()));
        }
    };

    const handleParameterChange = (selectedValues: string[]) => {
        onChange(selectedValues);
    };

    return (
        <div>
            <Label wrapperClassName="mb-4" text="Select Group(s)">
                <Select
                    options={allParameterGroupOptions}
                    value={selectedGroupFilterValues}
                    onChange={handleGroupChange}
                    multiple={true}
                    size={Math.min(10, allParameterGroupOptions.length > 0 ? allParameterGroupOptions.length : 1)}
                />
            </Label>
            <Label text="Select Parameter(s)">
                <>
                    <Label text="Auto-select all on group change" position="left">
                        <Switch
                            checked={autoSelectAllOnGroupChange}
                            onChange={(e) => setAutoSelectAllOnGroupChange(e.target.checked)}
                        />
                    </Label>
                    <Select
                        value={selectedParameterValuesForSelect}
                        onChange={handleParameterChange}
                        options={parameterOptions}
                        multiple={true}
                        size={Math.min(10, parameterOptions.length > 0 ? parameterOptions.length : 1)}
                        filter
                        showQuickSelectButtons
                    />
                </>
            </Label>
        </div>
    );
}

export default ParametersSelector;
