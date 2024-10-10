import React from "react";

import { SettingsStatusWriter } from "@framework/StatusWriter";
import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtom, useAtomValue } from "jotai";

import { WellpickSelect } from "./WellpickSelect";

import { userSelectedNonUnitWellpicksAtom, userSelectedUnitWellpicksAtom } from "../atoms/baseAtoms";
import { availableWellPicksAtom } from "../atoms/derivedAtoms";
import { padDataWithEmptyRowsAtom, viewerHorizontalAtom } from "../atoms/persistedAtoms";
import { wellborePicksQueryAtom, wellboreStratigraphicUnitsQueryAtom } from "../atoms/queryAtoms";

export type ViewerSettingsProps = {
    statusWriter: SettingsStatusWriter;
};

export function ViewerSettings(props: ViewerSettingsProps): React.ReactNode {
    // Well log selection
    const [horizontal, setHorizontal] = useAtom(viewerHorizontalAtom);
    const [padWithEmptyRows, setPadWithEmptyRows] = useAtom(padDataWithEmptyRowsAtom);
    const [selectedNonUnitPicks, setSelectedNonUnitPicks] = useAtom(userSelectedNonUnitWellpicksAtom);
    const [selectedUnitPicks, setSelectedUnitPicks] = useAtom(userSelectedUnitWellpicksAtom);
    const [addingWellpicks, setAddingWellpicks] = React.useState(
        !!selectedNonUnitPicks.length || !!selectedUnitPicks.length
    );

    // Wellpick selection
    const availableWellPicks = useAtomValue(availableWellPicksAtom);
    const wellPickQueryState = useGetWellpickQueryState(props.statusWriter);

    const onAddWellpickChange = React.useCallback(
        function onAddWellpickChange(_evt: unknown, checked: boolean) {
            setAddingWellpicks(checked);
            if (!checked) {
                setSelectedNonUnitPicks([]);
                setSelectedUnitPicks([]);
            }
        },
        [setSelectedNonUnitPicks, setSelectedUnitPicks]
    );

    return (
        <div className="space-y-2">
            {/* TODO: Other settings, like, color, max cols, etc */}
            <Label text="Horizontal:" position="left" labelClassName="!mb-0">
                <Checkbox checked={horizontal} onChange={(e, checked) => setHorizontal(checked)} />
            </Label>

            <Label text="Limit zoom to data:" position="left" labelClassName="!mb-0">
                <Checkbox checked={!padWithEmptyRows} onChange={(e, checked) => setPadWithEmptyRows(!checked)} />
            </Label>

            <Label text="Well picks:" position="left">
                <>
                    <Checkbox checked={addingWellpicks} onChange={onAddWellpickChange} />
                </>
            </Label>
            {addingWellpicks && (
                <PendingWrapper isPending={wellPickQueryState.anyLoading} errorMessage={wellPickQueryState.errorMsg}>
                    <div className="border-l-4 border-gray-300 pl-2 bg-gray-100 rounded-r">
                        <WellpickSelect
                            availableWellpicks={availableWellPicks}
                            selectedNonUnitPicks={selectedNonUnitPicks}
                            selectedUnitPicks={selectedUnitPicks}
                            onNonUnitPicksChange={setSelectedNonUnitPicks}
                            onUnitPicksChange={setSelectedUnitPicks}
                        />
                    </div>
                </PendingWrapper>
            )}
        </div>
    );
}

// As `availableWellpicks` is computed based on two separate queries, we need to check loading states and error messages of both.
function useGetWellpickQueryState(statusWriter: SettingsStatusWriter): { anyLoading: boolean; errorMsg: string } {
    const wellpicksQuery = useAtomValue(wellborePicksQueryAtom);
    const stratUnitQuery = useAtomValue(wellboreStratigraphicUnitsQueryAtom);

    const pickQueryError = usePropagateApiErrorToStatusWriter(wellpicksQuery, statusWriter);
    const unitQueryError = usePropagateApiErrorToStatusWriter(stratUnitQuery, statusWriter);

    return {
        anyLoading: wellpicksQuery.isLoading || stratUnitQuery.isLoading,
        errorMsg: pickQueryError ?? unitQueryError ?? "",
    };
}
