import React, { useEffect, useState } from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { useQuery } from "@tanstack/react-query";

import type { Options, GetDerivedVectorTableHybridData_api } from "@api";
import { getDerivedVectorTableHybrid, getDerivedVectorTableHybridQueryKey } from "@api";

import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useLroProgress, wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";

import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { Input } from "@lib/components/Input";
import { Button } from "@lib/components/Button";
import type { SelectOption } from "@lib/components/Select";

import type { Interfaces } from "../interfaces";
import { availableVectorsAtom, selectedEnsembleIdentAtom } from "./atoms";
import { viewDisplayableDataAtom } from "./atoms";
import { viewInputDataAtom } from "./atoms";



//-----------------------------------------------------------------------------------------------------------
export function DbgLroTestingSettings(props: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const availableVectors = useAtomValue(availableVectorsAtom);

    const [selectedVectors, setSelectedVectors] = useState<string[]>([]);
    const [calculationParamString, setCalculationParamString] = useState<string>("");

    const [hybridProgressText, setHybridProgressText] = React.useState<string | null>(null);

    const setViewInputData = useSetAtom(viewInputDataAtom);
    const setViewDisplayableData = useSetAtom(viewDisplayableDataAtom);

    const hybrid_apiFunctionArgs: Options<GetDerivedVectorTableHybridData_api, false> = {
        query: {
            case_uuid: selectedEnsembleIdent.value?.getCaseUuid() ?? "DUMMY_CASE",
            ensemble_name: selectedEnsembleIdent.value?.getEnsembleName() ?? "DUMMY_ENSEMBLE",
            vector_names: selectedVectors,
        },
    };
    const hybrid_derivedTableQueryKey = getDerivedVectorTableHybridQueryKey(hybrid_apiFunctionArgs);
    //console.log("hybrid_derivedTableQueryKey:", hybrid_derivedTableQueryKey);
    const hybrid_derivedTableQueryOptions = wrapLongRunningQuery({
        queryFn: getDerivedVectorTableHybrid,
        queryFnArgs: hybrid_apiFunctionArgs,
        queryKey: hybrid_derivedTableQueryKey,
        delayBetweenPollsSecs: 0.5,
        maxTotalDurationSecs: 120,
    });
    const hybrid_derivedTableQuery = useQuery({
        ...hybrid_derivedTableQueryOptions,
        enabled: selectedEnsembleIdent ? true : false,
    });

    function handleProgress(progressMessage: string | null) {
        if (progressMessage) {
            console.debug(`HYBRID PROGRESS: ${progressMessage}`);
            setHybridProgressText(progressMessage);
        }
    }
    useLroProgress(hybrid_derivedTableQueryOptions.queryKey, handleProgress);

    const isLoadingDerivedTableHandle = hybrid_derivedTableQuery.isFetching;
    if (!isLoadingDerivedTableHandle && hybridProgressText) {
        setHybridProgressText(null);
    }

    const derivedTableHandle = hybrid_derivedTableQuery.data?.table_handle ?? null;


    useEffect(
        function propagateChangesToDisplayableData() {
            let infoString = `Selected ensemble: ${selectedEnsembleIdent?.value ?? "none"}`;
            infoString += `\nSelected vectors: ${selectedVectors.length > 0 ? selectedVectors.join(", ") : "none"}`;
            setViewDisplayableData({
                infoString: infoString,
                settingsIsLoading: isLoadingDerivedTableHandle,
                settingsProgressText: hybridProgressText,
            });
        },
        [selectedEnsembleIdent, selectedVectors, isLoadingDerivedTableHandle, hybridProgressText, setViewDisplayableData],
    );

    useEffect(
        function propagateChangesToViewInputData() {
            setViewInputData({
                ensembleIdent: selectedEnsembleIdent.value,
                derivedTableHandle: derivedTableHandle,
                calculationParams: calculationParamString,
            });
        },
        [selectedEnsembleIdent, derivedTableHandle, calculationParamString, setViewInputData],
    );

    const vectorNameOptions: SelectOption[] =
        availableVectors.data?.map((item) => ({
            value: item.name,
            label: item.name,
        })) ?? [];

    function handleEnsembleSelectionChange(newEnsembleIdent: RegularEnsembleIdent | null) {
        console.debug(`handleEnsembleSelectionChange(${newEnsembleIdent})`);
        setSelectedEnsembleIdent(newEnsembleIdent);
    }

    function handleVectorSelectionChange(newVectors: string[]) {
        console.debug(`handleVectorSelectionChange(${newVectors})`);
        setSelectedVectors(newVectors);
    }

    function handleRefetchDerivedTable() {
        console.debug(`handleRefetchDerivedTable`);
        hybrid_derivedTableQuery.refetch();
    }

    return (
        <>
            <div className="flex flex-col gap-2">
                <Label text="Ensemble:">
                    <EnsembleDropdown
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdent?.value}
                        onChange={handleEnsembleSelectionChange}
                    />
                </Label>

                <Label text="Vectors:">
                    <Select
                        options={vectorNameOptions}
                        size={20}
                        multiple={true}
                        value={selectedVectors}
                        onChange={handleVectorSelectionChange}
                    />
                </Label>

                <div className="mt-4" />
                <Label text="Derived table:">
                    {derivedTableHandle ? (
                        <div>Handle: {derivedTableHandle}</div>
                    ) : !derivedTableHandle && hybridProgressText ? (
                        <div>Progress: {hybridProgressText ?? "N/A"}</div>
                    ) : (
                        <div>No derived table handle</div>
                    )}
                </Label>

                <Button className="m-2 text-xs py-0" variant="outlined" onClick={handleRefetchDerivedTable}>
                    Refetch derived table
                </Button>

                <div className="mt-4" />
                <Label text="Calculation Parameters:">
                    <Input
                        value={calculationParamString}
                        onChange={(e) => setCalculationParamString(e.target.value as string ?? "")}
                    />
                </Label>
            </div>
        </>
    );
}
