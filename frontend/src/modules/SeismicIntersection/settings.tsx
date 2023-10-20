import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";

import { useSeismicCubeDirectoryQuery } from "./queryHooks";
import { State } from "./state";
import { SeismicAddress } from "./types";
import { SeismicCubeDirectory, TimeType } from "./utils/seismicCubeDirectory";

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const ensembleSet = useEnsembleSet(workbenchSession);

    const setSeismicAddress = moduleContext.useSetStoreValue("seismicAddress");

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [realizationNumber, setRealizationNumber] = React.useState<number>(0);
    const [isObserved, setIsObserved] = React.useState<boolean>(false);
    const [selectedSeismicAttribute, setSelectedSeismicattribute] = React.useState<string | null>(null);
    const [selectedTime, setSelectedTime] = React.useState<string | null>(null);

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    const seismicCubeDirectoryQuery = useSeismicCubeDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    const seismicCubeDirectory = seismicCubeDirectoryQuery.data
        ? new SeismicCubeDirectory({
              seismicCubeMetas: seismicCubeDirectoryQuery.data,
              timeType: TimeType.TimePoint, // Convert from 3D/4D to time type?
              useObservedSeismicCubes: isObserved,
          })
        : null;

    React.useEffect(
        function propagateSeismicAddress() {
            let seismicAddress: SeismicAddress | null = null;
            if (computedEnsembleIdent && selectedSeismicAttribute && selectedTime) {
                seismicAddress = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensemble: computedEnsembleIdent.getEnsembleName(),
                    realizationNumber: realizationNumber,
                    attribute: selectedSeismicAttribute,
                    timeString: selectedTime,
                    observed: isObserved,
                };
            }
            setSeismicAddress(seismicAddress);
        },
        [
            computedEnsembleIdent,
            selectedSeismicAttribute,
            selectedTime,
            isObserved,
            realizationNumber,
            // setSeismicAddress,
        ]
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleRealizationTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const base10 = 10;
        const realNum = parseInt(event.target.value, base10);
        if (realNum >= 0) {
            setRealizationNumber(realNum);
        }
    }

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup title="Ensemble and Realization">
                <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                    <SingleEnsembleSelect
                        ensembleSet={ensembleSet}
                        value={computedEnsembleIdent ? computedEnsembleIdent : null}
                        onChange={handleEnsembleSelectionChange}
                    />
                </Label>
                <Label text="Realization">
                    <Input type={"number"} value={realizationNumber} onChange={handleRealizationTextChanged} />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup title="Seismic specifications">
                {/**
                 * TODO:
                 * - Add `isObserved` control -> simulated/observed toggle with radio buttons
                 * - Seismic survey type -> 3D, Preprocessed 4D or Calculate 4D survey with radio buttons
                 */}
                {/* <ApiStateWrapper apiResult={}></ApiStateWrapper> */}
            </CollapsibleGroup>
        </div>
    );
}
