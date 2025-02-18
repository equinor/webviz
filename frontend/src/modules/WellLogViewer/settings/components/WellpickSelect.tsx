import React from "react";

import { SettingsStatusWriter } from "@framework/StatusWriter";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption, SelectProps } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import _ from "lodash";

import {
    userSelectedWellPickColumnAtom,
    userSelectedWellPickInterpreterAtom,
    userSelectedWellPicksAtom,
} from "../atoms/baseAtoms";
import {
    availableWellPickInterpretersAtom,
    selectedWellPickColumnAtom,
    selectedWellPickInterpreter,
    wellPicksByInterpreterAtom,
} from "../atoms/derivedAtoms";
import { wellborePicksQueryAtom, wellboreStratColumnsQueryAtom } from "../atoms/queryAtoms";

export type WellpickSelectProps = {
    statusWriter: SettingsStatusWriter;
} & Omit<SelectProps, "options" | "value" | "onChange">;

export function WellpickSelect(props: WellpickSelectProps): React.ReactNode {
    // Wellpick query status
    const wellPicksQuery = useAtomValue(wellborePicksQueryAtom);
    const pickQueryError = usePropagateApiErrorToStatusWriter(wellPicksQuery, props.statusWriter);

    // Strat column selection
    const stratColumnDropdownOptions = useStratColumnOptions();
    const selectedWellPickColumn = useAtomValue(selectedWellPickColumnAtom);
    const setSelectedWellPickColumn = useSetAtom(userSelectedWellPickColumnAtom);

    // Pick interpreter selection
    const interpreterOptions = usePickInterpreterOptions();
    const selectedInterpreter = useAtomValue(selectedWellPickInterpreter);
    const setUserSelectedInterpreter = useSetAtom(userSelectedWellPickInterpreterAtom);

    // Wellpick selection
    const pickOptions = useWellPickOptions();
    const [userSelectedWellPicks, setUserSelectedWellPicks] = useAtom(userSelectedWellPicksAtom);
    const handleChangeUnitPicks = React.useCallback(
        function handleChangeUnitPicks(value: string[]) {
            // Allow the user to de-select if they click the already chosen value
            const newVal = _.isEqual(value, userSelectedWellPicks) ? [] : value;

            setUserSelectedWellPicks(newVal);
        },
        [userSelectedWellPicks, setUserSelectedWellPicks]
    );

    return (
        <>
            <div className="text-sm grid gap-x-3 gap-y-4 grid-cols-[auto_1fr]">
                <span className="mt-1">Strat column</span>
                <Dropdown
                    value={selectedWellPickColumn ?? ""}
                    options={stratColumnDropdownOptions}
                    onChange={(v) => {
                        if (v === selectedWellPickColumn) return;
                        setUserSelectedWellPicks([]);
                        setSelectedWellPickColumn(v);
                    }}
                />

                {!!interpreterOptions.length && (
                    <>
                        {/* ! Ensure that this label isn't the longest one, to avoid layout-shifts */}
                        <span className="mt-1">Interpreter</span>
                        <Dropdown
                            value={selectedInterpreter}
                            options={interpreterOptions}
                            onChange={(v) => {
                                if (v === selectedInterpreter) return;
                                setUserSelectedWellPicks([]);
                                setUserSelectedInterpreter(v);
                            }}
                        />
                    </>
                )}
                <span className="mt-1">Well picks</span>
                <PendingWrapper isPending={wellPicksQuery.isLoading} errorMessage={pickQueryError ?? ""}>
                    <Select
                        value={userSelectedWellPicks}
                        options={pickOptions}
                        size={5}
                        multiple
                        onChange={handleChangeUnitPicks}
                    />
                </PendingWrapper>
            </div>
        </>
    );
}

function useStratColumnOptions(): DropdownOption[] {
    const availableStratColumns = useAtomValue(wellboreStratColumnsQueryAtom).data ?? [];

    return availableStratColumns.map(
        (colName): DropdownOption => ({
            label: colName,
            value: colName,
        })
    );
}

function usePickInterpreterOptions(): DropdownOption[] {
    const interpreters = useAtomValue(availableWellPickInterpretersAtom);

    // No reason to display anything if there's only one
    if (interpreters.length < 2) return [];

    return interpreters.map<DropdownOption>((v) => ({
        label: v,
        value: v,
    }));
}

function useWellPickOptions(): DropdownOption[] {
    const selectedInterpreter = useAtomValue(selectedWellPickInterpreter);
    const picksByInterpreter = useAtomValue(wellPicksByInterpreterAtom);

    if (!selectedInterpreter) return [];

    return picksByInterpreter[selectedInterpreter].map<SelectOption>((pick) => ({
        label: pick.pickIdentifier,
        value: pick.pickIdentifier,
    }));
}
