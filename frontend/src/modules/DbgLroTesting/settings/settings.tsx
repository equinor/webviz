import React, { useEffect, useState } from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { useQuery, useQueryClient, FetchStatus } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import type { Options, GetCombinedVectorTableHybridData_api } from "@api";
import { getCombinedVectorTableHybrid, getCombinedVectorTableHybridQueryKey } from "@api";

import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useLroProgress, wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import { getCalcSomethingOnCombinedTableOptions } from "@api";
import { getCombinedTableInfoOptions } from "@api";

import { Setting } from "@lib/components/Setting";
import { Select } from "@lib/components/Select";
import { TextInput } from "@lib/components/TextInput";
import { Button } from "@lib/components/Button";
import type { SelectOption } from "@lib/components/Select";

import type { Interfaces } from "../interfaces";
import { availableVectorsAtom, selectedEnsembleIdentAtom } from "./atoms";
import { viewDisplayableDataAtom } from "./atoms";
import { viewInputDataAtom } from "./atoms";



//-----------------------------------------------------------------------------------------------------------
export function DbgLroTestingSettings(props: ModuleSettingsProps<Interfaces>) {
    const queryClient = useQueryClient();

    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);

    const availableVectors = useAtomValue(availableVectorsAtom);
    const [selectedVectors, setSelectedVectors] = useState<string[]>([]);

    const [calculationParamString, setCalculationParamString] = useState<string>("");

    const [hybridProgressText, setHybridProgressText] = React.useState<string | null>(null);

    const setViewInputData = useSetAtom(viewInputDataAtom);
    const setViewDisplayableData = useSetAtom(viewDisplayableDataAtom);

    
    const hybrid_apiFunctionArgs: Options<GetCombinedVectorTableHybridData_api, false> = {
        query: {
            case_uuid: selectedEnsembleIdent.value?.getCaseUuid() ?? "DUMMY_CASE",
            ensemble_name: selectedEnsembleIdent.value?.getEnsembleName() ?? "DUMMY_ENSEMBLE",
            vector_names: selectedVectors,
        },
    };
    const hybrid_combinedTableQueryKey = getCombinedVectorTableHybridQueryKey(hybrid_apiFunctionArgs);
    const hybrid_combinedTableQueryOptions = wrapLongRunningQuery({
        queryFn: getCombinedVectorTableHybrid,
        queryFnArgs: hybrid_apiFunctionArgs,
        queryKey: hybrid_combinedTableQueryKey,
        delayBetweenPollsSecs: 0.5,
        maxTotalDurationSecs: 120,
    });
    const hybrid_combinedTableQuery = useQuery({
        ...hybrid_combinedTableQueryOptions,
        enabled: selectedEnsembleIdent ? true : false,
    });
    //console.log(`hybrQuery: isEnabled=${hybrid_combinedTableQuery.isEnabled}, isFetching=${hybrid_combinedTableQuery.isFetching}, status=${hybrid_combinedTableQuery.status}, fetchStatus=${hybrid_combinedTableQuery.fetchStatus}, error=${hybrid_combinedTableQuery.error}`);

    function handleHybridProgress(progressMessage: string | null) {
        if (progressMessage) {
            console.debug(`HYBRID PROGRESS: ${progressMessage}`);
            setHybridProgressText(progressMessage);
        }
    }
    useLroProgress(hybrid_combinedTableQueryOptions.queryKey, handleHybridProgress);

    const isFetchingCombinedTableHandle = hybrid_combinedTableQuery.isFetching;
    if (!isFetchingCombinedTableHandle && hybridProgressText) {
        setHybridProgressText(null);
    }

    //const combinedTableHandle = hybrid_combinedTableQuery.isFetching ? null : (hybrid_combinedTableQuery.data?.table_handle ?? null);
    const combinedTableHandle = hybrid_combinedTableQuery.data?.table_handle ?? null;


    const infoQueryOptions = getCombinedTableInfoOptions({
        query: {
            table_handle: combinedTableHandle ?? "DUMMY",
        },
    });
    const infoQuery = useQuery({
        ...infoQueryOptions,
        enabled: Boolean(combinedTableHandle),
    });
    //console.log(`infoQuery: isEnabled=${infoQuery.isEnabled}, isFetching=${infoQuery.isFetching}, status=${infoQuery.status}, fetchStatus=${infoQuery.fetchStatus}, error=${infoQuery.error}`);

    const isFetchingInfo = infoQuery.isFetching;
    let infoStatusStr = "disabled";
    if (infoQuery.isEnabled) {
        infoStatusStr = infoQuery.status;
        if (infoQuery.error && isAxiosError(infoQuery.error)) {
            infoStatusStr += ` (${infoQuery.error.response?.status})`;
        }
    }
    const infoDataStr = infoQuery.data ? JSON.stringify(infoQuery.data) : "N/A";


    const calcQueryOptions = getCalcSomethingOnCombinedTableOptions({
        query: {
            table_handle: combinedTableHandle ?? "DUMMY",
            calculation_params: calculationParamString ?? "DUMMY",
        },
    });
    const calcQuery = useQuery({
        ...calcQueryOptions,
        enabled: Boolean(combinedTableHandle && calculationParamString),
    });
    //console.log(`calcQuery: isEnabled=${calcQuery.isEnabled}, isFetching=${calcQuery.isFetching}, status=${calcQuery.status}, fetchStatus=${calcQuery.fetchStatus}, error=${calcQuery.error}`);

    const isFetchingCalc = calcQuery.isFetching;
    let calcStatusStr = "disabled";
    if (calcQuery.isEnabled) {
        calcStatusStr = calcQuery.status;
        if (calcQuery.error && isAxiosError(calcQuery.error)) {
            calcStatusStr += ` (${calcQuery.error.response?.status})`;
        }
    }
    const calcDataStr = calcQuery.data ? JSON.stringify(calcQuery.data) : "N/A";

    // It seems that also error responses are cached by TanStack Query!!
    // We may have to add a check to see if the calcQuery is actually enabled here
    if (calcQuery.error && isAxiosError(calcQuery.error)) {
        console.log("calcQuery - HAS ERROR");
        const statusCode = calcQuery.error.response?.status;
        if (statusCode === 410) {
            console.log("Calc query returned 410, refetching combined table ----------------------");

            // Notes:
            // * queryClient.invalidateQueries does not work here since it still lets TanStack Query return old/stale data
            // * queryClient.setQueryData with undefined does not work, it is a no-op (could set to null)

            // The fetchStatus: "idle" should help avoid race conditions
            queryClient.resetQueries({ queryKey: hybrid_combinedTableQueryOptions.queryKey, exact: true, fetchStatus: "idle" });

            // Take a look here:
            // https://tanstack.com/query/latest/docs/reference/QueryClient#queryclientresetqueries
            // https://tanstack.com/query/latest/docs/framework/react/guides/filters#query-filters

            // Do we need to reset the calcQuery also??
            //queryClient.resetQueries({ queryKey: calcQueryOptions.queryKey, exact: true });
        }
    }


    useEffect(
        function propagateChangesToDisplayableData() {
            let debugInfoStr = `Selected vectors: ${selectedVectors.length > 0 ? selectedVectors.join(", ") : "none"}`;
            setViewDisplayableData({
                isFetchingCombinedTableHandle: isFetchingCombinedTableHandle,
                hybridStatusStr: hybrid_combinedTableQuery.status,
                hybridProgressText: hybridProgressText,
                isFetchingInfo: isFetchingInfo,
                infoStatusStr: infoStatusStr,
                infoDataStr: infoDataStr,
                isFetchingCalc: isFetchingCalc,
                calcStatusStr: calcStatusStr,
                calcDataStr: calcDataStr,
                debugInfoStr: debugInfoStr,
            });
        },
        [
            selectedVectors,
            isFetchingCombinedTableHandle,
            hybridProgressText,
            isFetchingInfo,
            infoStatusStr,
            infoDataStr,
            isFetchingCalc,
            calcStatusStr,
            calcDataStr,
            setViewDisplayableData,
        ],
    );

    useEffect(
        function propagateChangesToViewInputData() {
            setViewInputData({
                ensembleIdent: selectedEnsembleIdent.value,
                combinedTableHandle: combinedTableHandle,
                calculationParams: calculationParamString,
            });
        },
        [selectedEnsembleIdent, combinedTableHandle, calculationParamString, setViewInputData],
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

    function handleRefetchCombinedTableHandle() {
        console.debug(`handleRefetchCombinedTableHandle`);
        queryClient.resetQueries({ queryKey: hybrid_combinedTableQueryOptions.queryKey, exact: true, fetchStatus: "idle" });
    }

    async function handleRetryCombinedTableCreationTask() {
        console.debug(`handleRetryCombinedTableCreationTask`);
        await getCombinedVectorTableHybrid({ query: { ... hybrid_apiFunctionArgs.query, retry_creation_task: true } });
        queryClient.resetQueries({ queryKey: hybrid_combinedTableQueryOptions.queryKey, exact: true, fetchStatus: "idle" });
    }

    return (
        <Setting.Panel>
            <Setting.Field label="Ensemble:" stacked={true}>
                <EnsembleDropdown
                    ensembles={ensembleSet.getRegularEnsembleArray()}
                    value={selectedEnsembleIdent?.value}
                    onValueChange={handleEnsembleSelectionChange}
                />
            </Setting.Field>

            <Setting.Field label="Vectors to include:" stacked={true}>
                <Select
                    options={vectorNameOptions}
                    size={10}
                    multiple={true}
                    value={selectedVectors}
                    onValueChange={handleVectorSelectionChange}
                />
            </Setting.Field>

            <Setting.Field label="Combined table:" stacked={true}>
                {combinedTableHandle ? (
                    <div>Handle: {combinedTableHandle}</div>
                ) : !combinedTableHandle && hybridProgressText ? (
                    <div>Progress: {hybridProgressText}</div>
                ) : (
                    <div>No combined table handle</div>
                )}
            </Setting.Field>

            <Setting.Field label="" stacked={true}>
                <Button size="small" onClick={handleRefetchCombinedTableHandle}>
                    Refetch combined table handle
                </Button>
            </Setting.Field>

            <Setting.Field label="" stacked={true}>
                <Button size="small" onClick={handleRetryCombinedTableCreationTask}>
                    Retry combined table creation task
                </Button>
            </Setting.Field>

            <Setting.Field label="Calculation Parameters:" stacked={true}>
                <TextInput
                    value={calculationParamString}
                    onChange={(e) => setCalculationParamString((e.target.value as string) ?? "")}
                />
            </Setting.Field>
        </Setting.Panel>
    );
}
