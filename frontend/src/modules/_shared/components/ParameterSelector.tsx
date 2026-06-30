import React from "react";

import { ParameterIdent } from "@framework/EnsembleParameters";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { Setting } from "@lib/components/Setting";
import { SwitchCompositions } from "@lib/components/Switch/compositions";

const MIN_SELECTOR_SIZE = 3;
const MAX_SELECTOR_SIZE = 10;

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
        <>
            <Setting.Field label="Parameter groups" stacked>
                <Select
                    options={groupSelectOptions}
                    value={selectedGroupFilterValues}
                    onValueChange={handleGroupChange}
                    multiple={true}
                    size={Math.min(
                        MAX_SELECTOR_SIZE,
                        groupSelectOptions.length > MIN_SELECTOR_SIZE ? groupSelectOptions.length : MIN_SELECTOR_SIZE,
                    )}
                    showQuickSelectButtons
                />
            </Setting.Field>
            <Setting.Field label="Parameters" stacked>
                <div className="gap-y-xs flex flex-col">
                    <SwitchCompositions.WithLabel
                        label="Auto-select all on group change"
                        checked={autoSelectAllOnGroupChange}
                        onCheckedChange={setAutoSelectAllOnGroupChange}
                        size="small"
                    />
                    <Select
                        value={selectedParameterIdents.map((p) => p.toString())}
                        onValueChange={handleParameterChange}
                        options={parameterSelectOptions}
                        multiple={true}
                        size={Math.min(
                            MAX_SELECTOR_SIZE,
                            parameterSelectOptions.length > MIN_SELECTOR_SIZE
                                ? parameterSelectOptions.length
                                : MIN_SELECTOR_SIZE,
                        )}
                        filter
                        showQuickSelectButtons
                    />
                </div>
            </Setting.Field>
        </>
    );
}
