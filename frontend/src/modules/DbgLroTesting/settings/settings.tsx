import React, { useEffect, useState } from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { useQuery, useQueryClient, FetchStatus } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import type { Options, GetDerivedVectorTableHybridData_api } from "@api";
import { getDerivedVectorTableHybrid, getDerivedVectorTableHybridQueryKey } from "@api";

import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useLroProgress, wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { getCalcSomethingOnDerivedTableOptions } from "@api/@tanstack/react-query.gen";
import { getDerivedTableInfoOptions } from "@api/@tanstack/react-query.gen";

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
    const [retryCreationTask, setRetryCreationTask] = useState(false);

    const [hybridProgressText, setHybridProgressText] = React.useState<string | null>(null);
    const [calcProgressText, setCalcProgressText] = React.useState<string | null>(null);

    const setViewInputData = useSetAtom(viewInputDataAtom);
    const setViewDisplayableData = useSetAtom(viewDisplayableDataAtom);

    const hybrid_apiFunctionArgs: Options<GetDerivedVectorTableHybridData_api, false> = {
        query: {
            case_uuid: selectedEnsembleIdent.value?.getCaseUuid() ?? "DUMMY_CASE",
            ensemble_name: selectedEnsembleIdent.value?.getEnsembleName() ?? "DUMMY_ENSEMBLE",
            vector_names: selectedVectors,
            retry_creation_task: retryCreationTask ? true : undefined,
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

    console.log(`hybrQuery: isEnabled=${hybrid_derivedTableQuery.isEnabled}, isFetching=${hybrid_derivedTableQuery.isFetching}, status=${hybrid_derivedTableQuery.status}, fetchStatus=${hybrid_derivedTableQuery.fetchStatus}, error=${hybrid_derivedTableQuery.error}`);


    function handleHybridProgress(progressMessage: string | null) {
        if (progressMessage) {
            console.debug(`HYBRID PROGRESS: ${progressMessage}`);
            setHybridProgressText(progressMessage);
        }
    }
    useLroProgress(hybrid_derivedTableQueryOptions.queryKey, handleHybridProgress);

    // Clear the retryCreationTask once the query has sent the request with it
    useEffect(() => {
        if (retryCreationTask && !hybrid_derivedTableQuery.isFetching) {
            setRetryCreationTask(false);
        }
    }, [retryCreationTask, hybrid_derivedTableQuery.isFetching]);

    const isLoadingDerivedTableHandle = hybrid_derivedTableQuery.isFetching;
    if (!isLoadingDerivedTableHandle && hybridProgressText) {
        setHybridProgressText(null);
    }

    //const derivedTableHandle = hybrid_derivedTableQuery.isFetching ? null : (hybrid_derivedTableQuery.data?.table_handle ?? null);
    const derivedTableHandle = hybrid_derivedTableQuery.data?.table_handle ?? null;

    const case_uuid = selectedEnsembleIdent?.value?.getCaseUuid() ?? null;
    const ensemble_name = selectedEnsembleIdent?.value?.getEnsembleName() ?? null;
    //console.log(`VIEW: case_uuid: ${case_uuid}, ensemble_name: ${ensemble_name}, derivedTableHandle: ${derivedTableHandle}, calculationParamString: ${calculationParamString}`);
    console.log(`VIEW: derivedTableHandle: ${derivedTableHandle}, calculationParamString: ${calculationParamString}`);

    const infoQueryOptions = getDerivedTableInfoOptions({
        query: {
            table_handle: derivedTableHandle ?? "DUMMY",
        },
    });
    const infoQuery = useQuery({
        ...infoQueryOptions,
        enabled: Boolean(selectedEnsembleIdent && derivedTableHandle),
    });


    console.log(`infoQuery: isEnabled=${infoQuery.isEnabled}, isFetching=${infoQuery.isFetching}, status=${infoQuery.status}, fetchStatus=${infoQuery.fetchStatus}, error=${infoQuery.error}`);

    const calcQueryOptions = getCalcSomethingOnDerivedTableOptions({
        query: {
            table_handle: derivedTableHandle ?? "DUMMY",
            calculation_params: calculationParamString ?? "DUMMY",
        },
    });
    const calcQuery = useQuery({
        ...calcQueryOptions,
        enabled: Boolean(selectedEnsembleIdent && derivedTableHandle && calculationParamString),
    });

    console.log(`calcQuery: isEnabled=${calcQuery.isEnabled}, isFetching=${calcQuery.isFetching}, status=${calcQuery.status}, fetchStatus=${calcQuery.fetchStatus}, error=${calcQuery.error}`);

    const isLoadingCalc = calcQuery.isFetching;

    let calcStatusStr = "disabled";
    if (calcQuery.isEnabled) {
        calcStatusStr = calcQuery.status;
        if (calcQuery.error && isAxiosError(calcQuery.error)) {
            calcStatusStr += ` (${calcQuery.error.response?.status})`;
        }
    }

    //console.log(`calcQuery: isEnabled=${calcQuery.isEnabled}, status=${calcQuery.status}, error=${calcQuery.error}`);

    const calcDataStr = calcQuery.data ? JSON.stringify(calcQuery.data) : "N/A";

    const queryClient = useQueryClient();

    // It seems that also error responses are cached by TanStack Query!!
    // We may have to add a check to see if the calcQuery is actually enabled here
    if (calcQuery.error && isAxiosError(calcQuery.error)) {
        console.log("calcQuery - HAS ERROR");
        const statusCode = calcQuery.error.response?.status;
        if (statusCode === 410) {
            console.log("Calc query returned 410, refetching derived table ----------------------");

            // Notes:
            // * queryClient.invalidateQueries does not work here since it still lets TanStack Query return old/stale data
            // * queryClient.setQueryData with undefined does not work, it is a no-op (could set to null)

            // The fetchStatus: "idle" should help avoid race conditions
            queryClient.resetQueries({ queryKey: hybrid_derivedTableQueryOptions.queryKey, exact: true, fetchStatus: "idle" });

            // Take a look here:
            // https://tanstack.com/query/latest/docs/reference/QueryClient#queryclientresetqueries
            // https://tanstack.com/query/latest/docs/framework/react/guides/filters#query-filters

            // Do we need to reset the calcQuery also??
            //queryClient.resetQueries({ queryKey: calcQueryOptions.queryKey, exact: true });
        }
    }

    // useEffect(
    //     function refetchDerivedTableOn410() {
    //         if (calcQuery.error && isAxiosError(calcQuery.error)) {
    //             const statusCode = calcQuery.error.response?.status;
    //             if (statusCode === 410) {
    //                 console.log("Calc query returned 410, refetching derived table...");
    //                 queryClient.setQueryData(hybrid_derivedTableQueryKey, undefined);
    //                 queryClient.setQueryData(calcQueryOptions.queryKey, undefined);
    //                 queryClient.invalidateQueries({ queryKey: hybrid_derivedTableQueryKey, exact: true });
    //                 queryClient.invalidateQueries({ queryKey: calcQueryOptions.queryKey, exact: true });
    //             }
    //         }
    //     },
    //     // eslint-disable-next-line react-hooks/exhaustive-deps
    //     [calcQuery.error],
    // );

    useEffect(
        function propagateChangesToDisplayableData() {
            let infoString = `Selected ensemble: ${selectedEnsembleIdent?.value ?? "none"}`;
            infoString += `\nSelected vectors: ${selectedVectors.length > 0 ? selectedVectors.join(", ") : "none"}`;
            setViewDisplayableData({
                infoString: infoString,
                settings_isLoadingDerivedTableHandle: isLoadingDerivedTableHandle,
                settings_hybridProgressText: hybridProgressText,
                settings_isLoadingCalc: isLoadingCalc,
                settings_calcStatusStr: calcStatusStr,
                settings_calcDataStr: calcDataStr,
            });
        },
        [
            selectedEnsembleIdent,
            selectedVectors,
            isLoadingDerivedTableHandle,
            hybridProgressText,
            isLoadingCalc,
            calcStatusStr,
            calcDataStr,
            setViewDisplayableData,
        ],
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

    const vectorNameOptions: SelectOption[] = availableVectors.map((item) => ({value: item,label: item})) ?? [];

    function handleEnsembleSelectionChange(newEnsembleIdent: RegularEnsembleIdent | null) {
        console.debug(`handleEnsembleSelectionChange(${newEnsembleIdent})`);
        setSelectedEnsembleIdent(newEnsembleIdent);
    }

    function handleVectorSelectionChange(newVectors: string[]) {
        console.debug(`handleVectorSelectionChange(${newVectors})`);
        setSelectedVectors(newVectors);
    }

    function handleRefetchDerivedTableHandle() {
        console.debug(`handleRefetchDerivedTableHandle`);
        queryClient.resetQueries({ queryKey: hybrid_derivedTableQueryOptions.queryKey, exact: true, fetchStatus: "idle" });
    }

    function handleRetryDerivedTableCreationTask() {
        console.debug(`handleRetryDerivedTableCreationTask`);
        setRetryCreationTask(true);
        queryClient.resetQueries({ queryKey: hybrid_derivedTableQueryOptions.queryKey, exact: true, fetchStatus: "idle" });
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
                        size={10}
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

                <Button variant="text" onClick={handleRefetchDerivedTableHandle}>
                    Refetch derived table handle
                </Button>
                <Button variant="text" onClick={handleRetryDerivedTableCreationTask}>
                    Retry derived table creation task
                </Button>

                <div className="mt-4" />
                <Label text="Calculation Parameters:">
                    <Input
                        value={calculationParamString}
                        onChange={(e) => setCalculationParamString((e.target.value as string) ?? "")}
                    />
                </Label>
            </div>
        </>
    );
}
