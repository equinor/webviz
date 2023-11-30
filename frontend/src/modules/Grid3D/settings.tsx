import React, { useEffect } from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { useWellHeadersQuery } from "@modules/_shared/WellBore/queryHooks";

import { useGridModelNames, useGridParameterNames } from "./queryHooks";
import state from "./state";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices, workbenchSession }: ModuleFCProps<state>) {
    // From Workbench

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    // State
    const [gridName, setGridName] = moduleContext.useStoreState("gridName");
    const [parameterName, setParameterName] = moduleContext.useStoreState("parameterName");
    const [realizations, setRealizations] = moduleContext.useStoreState("realizations");
    const [useStatistics, setUseStatistics] = moduleContext.useStoreState("useStatistics");
    const [selectedWellUuids, setSelectedWellUuids] = moduleContext.useStoreState("selectedWellUuids");
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    // Queries
    const firstCaseUuid = computedEnsembleIdent?.getCaseUuid() ?? null;
    const firstEnsembleName = computedEnsembleIdent?.getEnsembleName() ?? null;
    const gridNamesQuery = useGridModelNames(firstCaseUuid, firstEnsembleName);
    const parameterNamesQuery = useGridParameterNames(firstCaseUuid, firstEnsembleName, gridName);
    const wellHeadersQuery = useWellHeadersQuery(computedEnsembleIdent?.getCaseUuid());
    // Handle Linked query
    useEffect(() => {
        if (parameterNamesQuery.data) {
            if (gridName && parameterNamesQuery.data.find((name) => name === parameterName)) {
                // New grid has same parameter
            } else {
                // New grid has different parameter. Set to first
                setParameterName(parameterNamesQuery.data[0]);
            }
        }
    }, [parameterNamesQuery.data, parameterName]);

    const parameterNames = parameterNamesQuery.data ? parameterNamesQuery.data : [];
    const allRealizations = computedEnsembleIdent
        ? ensembleSet
              .findEnsemble(computedEnsembleIdent)
              ?.getRealizations()
              .map((real) => JSON.stringify(real)) ?? []
        : [];

    let wellHeaderOptions: SelectOption[] = [];

    if (wellHeadersQuery.data) {
        wellHeaderOptions = wellHeadersQuery.data.map((header) => ({
            label: header.unique_wellbore_identifier,
            value: header.wellbore_uuid,
        }));
    }

    function handleWellsChange(selectedWellUuids: string[], allWellUuidsOptions: SelectOption[]) {
        const newSelectedWellUuids = selectedWellUuids.filter((wellUuid) =>
            allWellUuidsOptions.some((wellHeader) => wellHeader.value === wellUuid)
        );
        setSelectedWellUuids(newSelectedWellUuids);
    }
    function showAllWells(allWellUuidsOptions: SelectOption[]) {
        const newSelectedWellUuids = allWellUuidsOptions.map((wellHeader) => wellHeader.value);

        setSelectedWellUuids(newSelectedWellUuids);
    }
    function hideAllWells() {
        setSelectedWellUuids([]);
    }
    const gridNames: string[] = gridNamesQuery.data ? gridNamesQuery.data : [];
    return (
        <div>
            <CollapsibleGroup expanded={false} title="Realization / ensemble statistics">
                <Label text="Realizations">
                    <Select
                        options={stringToOptions(allRealizations || [])}
                        value={realizations ? (realizations as string[]) : [allRealizations[1]]}
                        onChange={(reals) => setRealizations(reals)}
                        filter={true}
                        size={5}
                        multiple={useStatistics}
                    />
                </Label>
                <Checkbox
                    label="Show mean parameter"
                    checked={useStatistics}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUseStatistics(event.target.checked)}
                />
                {"(Select multiple realizations)"}
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Grid data">
                <ApiStateWrapper
                    apiResult={gridNamesQuery}
                    errorComponent={"Error loading grid models"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Grid model">
                        <Select
                            options={stringToOptions(gridNames)}
                            value={[gridName || gridNames[0]]}
                            onChange={(gridnames) => setGridName(gridnames[0])}
                            filter={true}
                            size={5}
                        />
                    </Label>

                    <Label text="Grid parameter">
                        <Select
                            options={stringToOptions(parameterNames || [])}
                            value={[parameterName || parameterNames[0]]}
                            onChange={(pnames) => setParameterName(pnames[0])}
                            filter={true}
                            size={5}
                        />
                    </Label>
                </ApiStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Well data">
                <ApiStateWrapper
                    apiResult={wellHeadersQuery}
                    errorComponent={"Error loading wells"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Drilled Wells">
                        <>
                            <div>
                                <Button
                                    className="float-left m-2 text-xs py-0"
                                    variant="outlined"
                                    onClick={() => showAllWells(wellHeaderOptions)}
                                >
                                    Select all
                                </Button>
                                <Button className="m-2 text-xs py-0" variant="outlined" onClick={hideAllWells}>
                                    Select none
                                </Button>
                            </div>
                            <Select
                                options={wellHeaderOptions}
                                value={selectedWellUuids}
                                onChange={(selectedWellUuids: string[]) =>
                                    handleWellsChange(selectedWellUuids, wellHeaderOptions)
                                }
                                size={10}
                                multiple={true}
                            />
                        </>
                    </Label>
                </ApiStateWrapper>
            </CollapsibleGroup>
        </div>
    );
}

const stringToOptions = (strings: string[]): SelectOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
};
