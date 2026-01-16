import React from "react";

import { ParameterIdent } from "@framework/EnsembleParameters";
import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";

type ParametersSelectorProps = {
    allParameterIdents: ParameterIdent[];
    selectedParameterIdents: ParameterIdent[];
    onChange: (selected: ParameterIdent[]) => void;
};

enum GroupType {
    NO_GROUP = "NO GROUP",
}

export function ParametersSelector({
    allParameterIdents,
    selectedParameterIdents,
    onChange,
}: ParametersSelectorProps): React.ReactNode {
    const [autoSelectAllOnGroupChange, setAutoSelectAllOnGroupChange] = React.useState<boolean>(true);
    const [userHasInteracted, setUserHasInteracted] = React.useState<boolean>(false);
    const [selectedGroupFilterValues, setSelectedGroupFilterValues] = React.useState<string[]>([]);

    const [prevSelectedParameterIdents, setPrevSelectedParameterIdents] =
        React.useState<ParameterIdent[]>(selectedParameterIdents);
    if (prevSelectedParameterIdents !== selectedParameterIdents) {
        setPrevSelectedParameterIdents(selectedParameterIdents);
        if (selectedGroupFilterValues.length === 0 && selectedParameterIdents.length > 0) {
            setSelectedGroupFilterValues(
                Array.from(new Set(selectedParameterIdents.map((p) => p.groupName ?? GroupType.NO_GROUP))),
            );
        }
    }
    React.useEffect(
        function selectAllParametersUntilUserInteracts() {
            if (!userHasInteracted && allParameterIdents.length > 0) {
                const allGroups = Array.from(new Set(allParameterIdents.map((p) => p.groupName ?? GroupType.NO_GROUP)));
                setSelectedGroupFilterValues(allGroups);
                onChange(allParameterIdents);
            }
        },
        [allParameterIdents, userHasInteracted, onChange],
    );
    const handleInteractiveOnChange = React.useCallback(
        function handleInteractiveOnChange(newParameters: ParameterIdent[]) {
            if (!userHasInteracted) {
                setUserHasInteracted(true);
            }
            onChange(newParameters);
        },
        [userHasInteracted, onChange],
    );
    const handleGroupChange = React.useCallback(
        function handleGroupChange(newlySelectedGroupFilterStrings: string[]) {
            setSelectedGroupFilterValues(newlySelectedGroupFilterStrings);

            if (newlySelectedGroupFilterStrings.length === 0) {
                handleInteractiveOnChange([]);
            } else {
                const parametersThatMatchNewGroups = allParameterIdents.filter((p) =>
                    newlySelectedGroupFilterStrings.some(
                        (groupValue) => groupValue === (p.groupName ?? GroupType.NO_GROUP),
                    ),
                );

                let newSelectedParameters: ParameterIdent[] = [];

                if (autoSelectAllOnGroupChange) {
                    newSelectedParameters = parametersThatMatchNewGroups;
                } else {
                    newSelectedParameters = selectedParameterIdents.filter((p) =>
                        parametersThatMatchNewGroups.some((pg) => pg.equals(p)),
                    );
                    if (newSelectedParameters.length === 0 && parametersThatMatchNewGroups.length > 0) {
                        newSelectedParameters = [parametersThatMatchNewGroups[0]];
                    }
                }

                handleInteractiveOnChange(newSelectedParameters);
            }
        },
        [allParameterIdents, autoSelectAllOnGroupChange, selectedParameterIdents, handleInteractiveOnChange],
    );
    const handleParameterChange = (selectedValues: string[]) => {
        handleInteractiveOnChange(selectedValues.map((s) => ParameterIdent.fromString(s)));
    };

    const groupSelectOptions: SelectOption[] = Array.from(
        new Set(allParameterIdents.map((p) => p.groupName ?? GroupType.NO_GROUP)),
    ).map((groupName) => ({
        label: groupName,
        value: groupName,
    }));

    const parameterSelectOptions: SelectOption[] = allParameterIdents
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

    return (
        <div>
            <Label wrapperClassName="mb-4" text="Select Group(s)">
                <Select
                    options={groupSelectOptions}
                    value={selectedGroupFilterValues}
                    onChange={handleGroupChange}
                    multiple={true}
                    size={Math.min(10, groupSelectOptions.length > 0 ? groupSelectOptions.length : 1)}
                    showQuickSelectButtons
                />
            </Label>
            <Label text="Select Parameter(s)">
                <>
                    <Checkbox
                        label="Auto-select all on group change"
                        checked={autoSelectAllOnGroupChange}
                        onChange={(e) => setAutoSelectAllOnGroupChange(e.target.checked)}
                    />
                    <Select
                        value={selectedParameterIdents.map((p) => p.toString())}
                        onChange={handleParameterChange}
                        options={parameterSelectOptions}
                        multiple={true}
                        size={Math.min(10, parameterSelectOptions.length > 0 ? parameterSelectOptions.length : 1)}
                        filter
                        showQuickSelectButtons
                    />
                </>
            </Label>
        </div>
    );
}
