import React from "react";

import { SettingsStatusWriter } from "@framework/StatusWriter";
import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtom, useAtomValue } from "jotai";

import { userSelectedNonUnitWellpicksAtom, userSelectedUnitWellpicksAtom } from "../../atoms/baseAtoms";
import { viewerHorizontalAtom } from "../../atoms/persistedAtoms";
import { wellborePicksAndStratigraphyQueryAtom } from "../../atoms/queryAtoms";
import { WellpickSelect } from "../WellpickSelect";

export type ViewerSettingsProps = {
    statusWriter: SettingsStatusWriter;
};

export function ViewerSettings(props: ViewerSettingsProps): React.ReactNode {
    // Well log selection
    const [horizontal, setHorizontal] = useAtom(viewerHorizontalAtom);

    // Wellpick selection
    const borePicksAndStratQuery = useAtomValue(wellborePicksAndStratigraphyQueryAtom);
    const availableWellPicks = borePicksAndStratQuery.data ?? { nonUnitPicks: [], unitPicks: [] };
    const wellpickErrorMsg = usePropagateApiErrorToStatusWriter(borePicksAndStratQuery, props.statusWriter) ?? "";

    const [selectedNonUnitPicks, setSelectedNonUnitPicks] = useAtom(userSelectedNonUnitWellpicksAtom);
    const [selectedUnitPicks, setSelectedUnitPicks] = useAtom(userSelectedUnitWellpicksAtom);

    return (
        <div className="space-y-2">
            {/* TODO: Other settings, like, color, max cols, etc */}
            <Label text="Horizontal: " position="left" labelClassName="!mb-0">
                <Checkbox checked={horizontal} onChange={(e, checked) => setHorizontal(checked)} />
            </Label>

            <Label text="Well picks">
                <PendingWrapper isPending={borePicksAndStratQuery.isPending} errorMessage={wellpickErrorMsg}>
                    <WellpickSelect
                        availableWellpicks={availableWellPicks}
                        selectedNonUnitPicks={selectedNonUnitPicks}
                        selectedUnitPicks={selectedUnitPicks}
                        onNonUnitPicksChange={setSelectedNonUnitPicks}
                        onUnitPicksChange={setSelectedUnitPicks}
                    />
                </PendingWrapper>
            </Label>
        </div>
    );
}
