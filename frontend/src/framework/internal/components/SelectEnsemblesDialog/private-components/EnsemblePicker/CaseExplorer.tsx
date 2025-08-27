import React from "react";

import { CircularProgress } from "@equinor/eds-core-react";
import { useQuery } from "@tanstack/react-query";
import { isEqual } from "lodash";

import { getCasesOptions, type EnsembleInfo_api } from "@api";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { tanstackDebugTimeOverride } from "@framework/internal/utils/debug";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Switch } from "@lib/components/Switch";
import { Table } from "@lib/components/Table";
import type { TableFilters } from "@lib/components/Table/types";
import { TagPicker } from "@lib/components/TagPicker";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { useValidState } from "@lib/hooks/useValidState";

import {
    makeCaseRowData,
    makeCaseTableColumns,
    readInitialStateFromLocalStorage,
    storeStateInLocalStorage,
} from "./_utils";

const STALE_TIME = tanstackDebugTimeOverride(0);
const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

export type CaseSelection = {
    caseName: string;
    caseUuid: string;
    filteredEnsembles: EnsembleInfo_api[] | null;
};

export type CaseExplorerProps = {
    field: string | null;
    onCaseSelectionChange: (caseSelection: CaseSelection) => void;
};
export function CaseExplorer(props: CaseExplorerProps): React.ReactNode {
    const { userInfo } = useAuthProvider();
    const userName = React.useMemo(() => {
        return userInfo?.username.replace("@equinor.com", "").toLowerCase() ?? "";
    }, [userInfo]);

    // --- State ---
    const [numberOfCases, setNumberOfCases] = React.useState<number>(0);
    const [currentStatusOptions, setCurrentStatusOptions] = React.useState<string[]>([]);
    const [showOnlyMyCases, setShowOnlyMyCases] = React.useState<boolean>(
        readInitialStateFromLocalStorage("showOnlyMyCases") === "true",
    );
    const [showOnlyOfficialCases, setShowOnlyOfficialCases] = React.useState<boolean>(
        readInitialStateFromLocalStorage("showOfficialCases") === "true",
    );
    const [tableFiltersState, setTableFiltersState] = React.useState<TableFilters>({
        ...(showOnlyMyCases && { author: userName }),
        ...(showOnlyOfficialCases && { status: ["official"] }),
    });

    const [prevCaseSelection, setPrevCaseSelection] = React.useState<CaseSelection | null>(null);

    // --- Queries ---
    const casesQuery = useQuery({
        ...getCasesOptions({ query: { field_identifier: props.field ?? "" } }),
        enabled: props.field !== null,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [selectedCaseUuid, setSelectedCaseId] = useValidState<string>({
        initialState: "",
        validStates: casesQuery.data?.map((item) => item.uuid) ?? [],
        keepStateWhenInvalid: true,
    });

    // --- Derived data ---
    const caseTableColumns = React.useMemo(() => {
        const disabledFilterComponents = {
            disableAuthorComponent: showOnlyMyCases,
            disableStatusComponent: showOnlyOfficialCases,
        };

        return makeCaseTableColumns(currentStatusOptions, disabledFilterComponents);
    }, [currentStatusOptions, showOnlyMyCases, showOnlyOfficialCases]);

    // Ensure selected status is among options, when not showing only official cases
    const statusFilterState = (tableFiltersState["status"] as string[]) ?? null;
    if (
        !showOnlyOfficialCases &&
        statusFilterState &&
        !statusFilterState.every((elm) => currentStatusOptions.includes(elm))
    ) {
        setTableFiltersState((prev) => ({
            ...prev,
            status: statusFilterState.filter((elm) => currentStatusOptions.includes(elm)),
        }));
    }

    // Extract unique status options and standard results from cases data when it's available
    if (casesQuery.data) {
        const uniqueStatuses = [...new Set(casesQuery.data.map((c) => c.status))];
        if (!isEqual(uniqueStatuses, currentStatusOptions)) {
            setCurrentStatusOptions(uniqueStatuses);
        }
    }

    // // Extract unique standard results from cases data when it's available
    const casesStandardResults = React.useMemo(() => {
        if (!casesQuery.data) {
            return [];
        }

        const standardResults = new Set<string>();
        for (const c of casesQuery.data) {
            c.ensembles.forEach((ens) => {
                ens.standardResults.forEach((res) => {
                    standardResults.add(res);
                });
            });
        }

        return Array.from(standardResults).sort();
    }, [casesQuery.data]);

    const [selectedStandardResults, setSelectedStandardResults] = useValidArrayState<string>({
        initialState: [],
        validStateArray: casesStandardResults,
        keepStateWhenInvalid: !casesQuery.data, // Requires valid state when data is available, allows invalid while data is fetching
    });

    const caseRowData = React.useMemo(() => {
        if (!casesQuery.data) {
            return [];
        }

        let cases = casesQuery.data;
        if (selectedStandardResults.length > 0) {
            cases = cases.filter((c) =>
                c.ensembles.some((ens) => ens.standardResults.some((res) => selectedStandardResults.includes(res))),
            );
        }

        return makeCaseRowData(cases);
    }, [casesQuery.data, selectedStandardResults]);

    const currentCaseSelection: CaseSelection = React.useMemo(() => {
        const selectedCase = casesQuery.data?.find((c) => c.uuid === selectedCaseUuid);
        let selectedCaseFilteredEnsembles = null;
        if (selectedCase) {
            selectedCaseFilteredEnsembles =
                selectedStandardResults.length === 0
                    ? selectedCase.ensembles
                    : selectedCase.ensembles.filter((ens) =>
                          ens.standardResults.some((res) => selectedStandardResults.includes(res)),
                      );
        }
        return {
            caseName: selectedCase?.name ?? "",
            caseUuid: selectedCaseUuid,
            filteredEnsembles: selectedCaseFilteredEnsembles,
        };
    }, [casesQuery.data, selectedCaseUuid, selectedStandardResults]);

    if (!isEqual(currentCaseSelection, prevCaseSelection)) {
        props.onCaseSelectionChange(currentCaseSelection);
        setPrevCaseSelection(currentCaseSelection);
    }

    // --- Handlers ---
    function handleOfficialCasesSwitchChange(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        setShowOnlyOfficialCases(checked);
        storeStateInLocalStorage("showOfficialCases", checked.toString());

        setTableFiltersState((prev) => ({
            ...prev,
            status: checked ? ["official"] : [],
        }));
    }

    const handleCasesByMeChange = React.useCallback(
        function handleCasesByMeChange(e: React.ChangeEvent<HTMLInputElement>) {
            const checked = e.target.checked;
            setShowOnlyMyCases(checked);
            storeStateInLocalStorage("showOnlyMyCases", checked.toString());

            setTableFiltersState((prev) => ({
                ...prev,
                author: checked ? userName : "",
            }));
        },
        [userName],
    );

    return (
        <div className="flex flex-col h-full gap-4">
            <QueryStateWrapper
                queryResult={casesQuery}
                errorComponent={<div className="text-red-500">Error loading cases</div>}
                loadingComponent={<CircularProgress />}
            >
                <TagPicker
                    placeholder="Filter by Standard Results..."
                    tags={casesStandardResults.map((elm) => ({ label: elm, value: elm }))}
                    value={selectedStandardResults}
                    onChange={(value) => setSelectedStandardResults([...value])}
                />
            </QueryStateWrapper>
            <PendingWrapper
                className="grow min-h-0"
                isPending={false}
                errorMessage={casesQuery.isError ? "Error loading cases" : undefined}
            >
                <div className="flex flex-col h-full">
                    <div className="flex justify-end gap-4 items-center">
                        <span className="grow text-sm text-slate-500">Select from {numberOfCases} cases</span>
                        <Label position="right" text="Official" title="Show only cases marked as official">
                            <Switch checked={showOnlyOfficialCases} onChange={handleOfficialCasesSwitchChange} />
                        </Label>
                        <Label position="right" text="My cases" title="Show only my cases">
                            <Switch checked={showOnlyMyCases} onChange={handleCasesByMeChange} />
                        </Label>
                    </div>
                    <div className="grow min-h-0">
                        <Table
                            rowIdentifier="caseId"
                            height={"100%"}
                            numPendingRows={!casesQuery.data ? "fill" : undefined}
                            columns={caseTableColumns}
                            rows={caseRowData}
                            selectedRows={[selectedCaseUuid]}
                            filters={tableFiltersState}
                            selectable
                            onSelectedRowsChange={(caseIds) => setSelectedCaseId((prev) => caseIds?.[0] ?? prev)}
                            onFiltersChange={setTableFiltersState}
                            onDataCollated={(data) => setNumberOfCases(data.length)}
                        />
                    </div>
                </div>
            </PendingWrapper>
        </div>
    );
}
