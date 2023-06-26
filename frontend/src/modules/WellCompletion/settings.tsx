import React from "react";

import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";

import { RealizationSelection, State } from "./state";

export const settings = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = moduleContext.useStoreState("ensembleIdent");
    const [selectedRealizationNumber, setSelectedRealizationNumber] =
        moduleContext.useStoreState("realizationToInclude");
    const [realizationSelection, setRealizationSelection] = moduleContext.useStoreState("realizationSelection");

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);

    React.useEffect(
        function selectDefaultEnsemble() {
            const fixedEnsembleIdent = fixupEnsembleIdent(selectedEnsembleIdent, ensembleSet);
            if (fixedEnsembleIdent !== selectedEnsembleIdent) {
                setSelectedEnsembleIdent(fixedEnsembleIdent);
            }
        },
        [ensembleSet, selectedEnsembleIdent]
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleRealizationSelectionChange(_: React.ChangeEvent<HTMLInputElement>, value: string | number) {
        setRealizationSelection(value as RealizationSelection.Aggregated | RealizationSelection.Single);
    }

    function handleSelectedRealizationNumberChange(realizationNumber: string) {
        setSelectedRealizationNumber(parseInt(realizationNumber));
    }

    const computedEnsemble = computedEnsembleIdent ? ensembleSet.findEnsemble(computedEnsembleIdent) : null;

    return (
        <>
            <Label
                text="Ensemble:"
                labelClassName={syncHelper.isSynced(SyncSettingKey.ENSEMBLE) ? "bg-indigo-700 text-white" : ""}
            >
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <Label text="Realization selection">
                <RadioGroup
                    options={[
                        { label: RealizationSelection.Aggregated, value: RealizationSelection.Aggregated },
                        { label: RealizationSelection.Single, value: RealizationSelection.Single },
                    ]}
                    value={realizationSelection}
                    onChange={handleRealizationSelectionChange}
                />
            </Label>
            {realizationSelection === RealizationSelection.Single && (
                <Label text="Realization">
                    <Dropdown
                        options={computedEnsemble === null ? [] : makeRealizationOptionItems(computedEnsemble)}
                        value={selectedRealizationNumber?.toString() ?? undefined}
                        onChange={handleSelectedRealizationNumberChange}
                    />
                </Label>
            )}
        </>
    );
};

//-----------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------------

function makeRealizationOptionItems(ensemble: Ensemble): DropdownOption[] {
    const optionItems: DropdownOption[] = [];
    ensemble.getRealizations().map((realization: number) => {
        optionItems.push({ label: realization.toString(), value: realization.toString() });
    });
    return optionItems;
}
