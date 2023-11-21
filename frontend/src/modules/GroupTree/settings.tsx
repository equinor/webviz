import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Label } from "@lib/components/Label";

import { useValidState } from "@lib/hooks/useValidState";
import { State } from "./state";
import { ModuleContext } from "@framework/ModuleContext";

export const settings = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    
    const setEnsembleIdent = moduleContext.useSetStoreValue("ensembleIdent")
    const statOrReal = moduleContext.useStoreValue("statOrReal")

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useValidState<EnsembleIdent | null>(null, [
        ensembleSet.getEnsembleArr(),
        (item: Ensemble) => item.getIdent(),
    ]);
    React.useEffect(
        function propagateEnsembleIdentToView() {
            setEnsembleIdent(selectedEnsembleIdent)
        }, [selectedEnsembleIdent]
    )
    
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const computedEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        const acceptInvalidState = false;
        setSelectedEnsembleIdent(computedEnsembleIdent, acceptInvalidState);
    }

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    //return <div>Ensemble</div>
    return (
        <>
            <Label
                text="Ensemble:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <>
                    <SingleEnsembleSelect
                        ensembleSet={ensembleSet}
                        value={computedEnsembleIdent}
                        onChange={handleEnsembleSelectionChange}
                    />
                </>
            </Label>
        </>
    );
};