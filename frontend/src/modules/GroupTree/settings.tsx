import React from "react";

import { Frequency_api } from "@api";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";

import { useValidState } from "@lib/hooks/useValidState";
import { State, StatisticsOrRealization } from "./state";
import { ModuleContext } from "@framework/ModuleContext";

export const settings = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(workbenchSession);
    
    const setEnsembleIdent = moduleContext.useSetStoreValue("ensembleIdent")
    const [selectedStatOrReal, setSelectedStatOrReal] = moduleContext.useStoreState("statOrReal");
    const [selectedRealization, setSelectedRealization] = moduleContext.useStoreState("realization");
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");

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
    const computedEnsemble = computedEnsembleIdent ? ensembleSet.findEnsemble(computedEnsembleIdent) : null;

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleStatOrRealChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSelectedStatOrReal(event.target.value as StatisticsOrRealization)
    }

    function handleRealizationChange(newReal: string) {
        setSelectedRealization(parseInt(newReal))
    }

    function handleFrequencySelectionChange(newFreqStr: string) {
        console.debug(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}`);
        let newFreq: Frequency_api | null = null;
        if (newFreqStr !== "RAW") {
            newFreq = newFreqStr as Frequency_api;
        }
        console.debug(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}  newFreq=${newFreq}`);
        setResamplingFrequency(newFreq);
    }

    return (
        <div>
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
            <Label text="Frequency">
                <Dropdown
                    options={makeFrequencyOptionItems()}
                    value={resampleFrequency ?? "RAW"}
                    onChange={handleFrequencySelectionChange}
                />
            </Label>
            <Label text="Statistics Or Realization">
                <RadioGroup
                    value={selectedStatOrReal}
                    options={Object.values(StatisticsOrRealization).map((val: StatisticsOrRealization) => {
                        return { value: val, label: val };
                    })}
                    onChange={handleStatOrRealChange}
                />
            </Label>
            <Label text="Realizations:">
                <Dropdown
                    options={makeRealizationItems(computedEnsemble?.getMaxRealizationNumber() ?? -1)}
                    value={selectedRealization.toString()}
                    onChange={handleRealizationChange}
                />
            </Label>
        </div>
    );
};

function makeFrequencyOptionItems(): DropdownOption[] {
    const itemArr: DropdownOption[] = [
        { value: Frequency_api.DAILY, label: "Daily" },
        { value: Frequency_api.MONTHLY, label: "Monthly" },
        { value: Frequency_api.QUARTERLY, label: "Quarterly" },
        { value: Frequency_api.YEARLY, label: "Yearly" },
    ];
    return itemArr;
}

function makeRealizationItems(nbOfReal: number): DropdownOption[] {
    const itemArr: DropdownOption[] = [];
    for (let real = 0; real <= nbOfReal-1; real++) {
        itemArr.push({ value: real.toString(), label: real.toString()})
      }
    return itemArr;
}