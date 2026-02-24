import React from "react";

import { Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { isEqual } from "lodash";

import { getCasesOptions, getFieldsOptions, type EnsembleInfo_api } from "@api";
import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { tanstackDebugTimeOverride } from "@framework/utils/debug";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { Switch } from "@lib/components/Switch";
import { Table } from "@lib/components/Table";
import { SortDirection, type TableSorting, type TableFilters } from "@lib/components/Table/types";
import { TagPicker } from "@lib/components/TagPicker";
import { TimeAgo } from "@lib/components/TimeAgo/timeAgo";
import { Tooltip } from "@lib/components/Tooltip";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { useValidState } from "@lib/hooks/useValidState";

import {
    makeCaseRowData,
    makeCaseTableColumns,
    readInitialStateFromLocalStorage,
    storeStateInLocalStorage,
} from "./_utils";

const STALE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);
const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

export type CaseSelection = {
    caseName: string;
    caseUuid: string;
    filteredEnsembles: EnsembleInfo_api[];
};

export type CaseExplorerProps = {
    disableQueries: boolean;
    onCaseSelectionChange: (caseSelection: CaseSelection | null) => void;
};
export function CaseExplorer(props: CaseExplorerProps): React.ReactNode {
    const { onCaseSelectionChange } = props;
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
    const [tableSortingState, setTableSortingState] = React.useState<TableSorting>([
        { columnId: "dateUtcMs", direction: SortDirection.DESC },
    ]);

    // Have without fixup to allow resetting to null when table filters out selected case
    const [selectedCaseUuid, setSelectedCaseUuid] = React.useState<string | null>(null);

    // Keep the prevCaseSelection state that was already defined
    const [prevCaseSelection, setPrevCaseSelection] = React.useState<CaseSelection | null>(null);

    // --- Queries ---
    const fieldsQuery = useQuery({
        ...getFieldsOptions(),
        enabled: !props.disableQueries,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
        refetchOnMount: "always", // Set to "always" to ensure data is fresh on mount
    });
    const fieldOptions = fieldsQuery.data?.map((f) => ({ value: f.fieldIdentifier, label: f.fieldIdentifier })) ?? [];

    const [selectedField, setSelectedField] = useValidState<string>({
        initialState: readInitialStateFromLocalStorage("selectedField"),
        validStates: fieldsQuery.data?.map((item) => item.fieldIdentifier) ?? [],
        keepStateWhenInvalid: true,
    });

    const casesQuery = useQuery({
        ...getCasesOptions({ query: { field_identifier: selectedField ?? "" } }),
        enabled: selectedField !== null && !props.disableQueries,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
        refetchOnMount: "always", // Set to "always" to ensure data is fresh on mount
    });

    // Sort cases by date descending (to prevent random order when no sorting is applied in the table)
    const sortedCasesQueryData = React.useMemo(
        function sortCaseQueryDataByDate() {
            if (!casesQuery.data) {
                return undefined;
            }
            return [...casesQuery.data].sort((a, b) => b.updatedAtUtcMs - a.updatedAtUtcMs);
        },
        [casesQuery.data],
    );

    // Ensure valid selected case uuid, use casesQuery data to utilize fetching state
    React.useEffect(
        function ensureValidSelectedCaseUuid() {
            if (selectedCaseUuid && casesQuery.data && !casesQuery.data.some((c) => c.uuid === selectedCaseUuid)) {
                setSelectedCaseUuid(null);
            }
        },
        [selectedCaseUuid, casesQuery.data],
    );

    // Refresh query handlers
    const { isRefreshing: isFieldsQueryRefreshing, refresh: refreshFields } = useRefreshQuery(fieldsQuery);
    const { isRefreshing: isCasesQueryRefreshing, refresh: refreshCases } = useRefreshQuery(casesQuery);

    // --- Derived data ---
    const lastUpdatedMs = React.useMemo(() => {
        return sortedCasesQueryData && casesQuery.dataUpdatedAt ? casesQuery.dataUpdatedAt : null;
    }, [sortedCasesQueryData, casesQuery.dataUpdatedAt]);

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
    if (sortedCasesQueryData) {
        const uniqueStatuses = [...new Set(sortedCasesQueryData.map((c) => c.status))];
        if (!isEqual(uniqueStatuses, currentStatusOptions)) {
            setCurrentStatusOptions(uniqueStatuses);
        }
    }

    // // Extract unique standard results from cases data when it's available
    const casesStandardResults = React.useMemo(() => {
        if (!sortedCasesQueryData) {
            return [];
        }

        const standardResults = new Set<string>();
        for (const c of sortedCasesQueryData) {
            c.ensembles.forEach((ens) => {
                ens.standardResults.forEach((res) => {
                    standardResults.add(res);
                });
            });
        }

        return Array.from(standardResults).sort();
    }, [sortedCasesQueryData]);

    const [selectedStandardResults, setSelectedStandardResults] = useValidArrayState<string>({
        initialState: [],
        validStateArray: casesStandardResults,
        keepStateWhenInvalid: !sortedCasesQueryData, // Requires valid state when data is available, allows invalid while data is fetching
    });

    const caseRowData = React.useMemo(() => {
        if (!sortedCasesQueryData) {
            return [];
        }

        let cases = sortedCasesQueryData;
        if (selectedStandardResults.length > 0) {
            cases = cases.filter((c) =>
                c.ensembles.some((ens) => ens.standardResults.some((res) => selectedStandardResults.includes(res))),
            );
        }

        return makeCaseRowData(cases);
    }, [sortedCasesQueryData, selectedStandardResults]);

    const currentCaseSelection: CaseSelection | null = React.useMemo(() => {
        if (!selectedCaseUuid) {
            return null;
        }

        const selectedCase = sortedCasesQueryData?.find((c) => c.uuid === selectedCaseUuid);
        if (!selectedCase) {
            return null;
        }

        const selectedCaseFilteredEnsembles =
            selectedStandardResults.length === 0
                ? selectedCase.ensembles
                : selectedCase.ensembles.filter((ens) =>
                      ens.standardResults.some((res) => selectedStandardResults.includes(res)),
                  );

        return {
            caseName: selectedCase.name,
            caseUuid: selectedCaseUuid,
            filteredEnsembles: selectedCaseFilteredEnsembles,
        };
    }, [sortedCasesQueryData, selectedCaseUuid, selectedStandardResults]);

    // Add useEffect that compares with previous selection before calling the callback
    React.useEffect(() => {
        if (!isEqual(currentCaseSelection, prevCaseSelection)) {
            setPrevCaseSelection(currentCaseSelection);
            onCaseSelectionChange(currentCaseSelection);
        }
    }, [currentCaseSelection, onCaseSelectionChange, prevCaseSelection]);

    // --- Handlers ---
    function handleFieldChanged(fieldIdentifier: string) {
        storeStateInLocalStorage("selectedField", fieldIdentifier);
        setSelectedField(fieldIdentifier);
    }

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

    const handleManualRefetch = React.useCallback(
        function handleManualRefetch() {
            // Checking if queries are disabled or already isFetching (covers both fetching and re-fetching state)
            if (props.disableQueries || (casesQuery.isFetching && fieldsQuery.isFetching)) return;

            refreshFields();
            refreshCases();
        },
        [refreshCases, refreshFields, props.disableQueries, casesQuery.isFetching, fieldsQuery.isFetching],
    );

    return (
        <div className="flex flex-col h-full gap-4 min-h-0">
            <div className="flex flex-row gap-4">
                <Label text="Field" position="left">
                    <PendingWrapper
                        isPending={fieldsQuery.isFetching && !fieldsQuery.isRefetching}
                        errorMessage={fieldsQuery.error ? "Error loading fields" : undefined}
                    >
                        <Dropdown
                            options={fieldOptions}
                            value={selectedField}
                            onChange={handleFieldChanged}
                            disabled={fieldOptions.length === 0}
                        />
                    </PendingWrapper>
                </Label>
                <div className="grow flex flex-row gap-4 items-center">
                    <Label position="left" text="Only my cases">
                        <Tooltip title="Show only cases authored by me" enterDelay="medium">
                            <Switch checked={showOnlyMyCases} onChange={handleCasesByMeChange} />
                        </Tooltip>
                    </Label>
                    <Label position="left" text="Only official cases">
                        <Tooltip title="Show only cases marked as official" enterDelay="medium">
                            <Switch checked={showOnlyOfficialCases} onChange={handleOfficialCasesSwitchChange} />
                        </Tooltip>
                    </Label>
                    <PendingWrapper
                        isPending={casesQuery.isFetching && !casesQuery.isRefetching}
                        errorMessage={casesQuery.error ? "Error loading cases" : undefined}
                        className="h-full flex-1 min-h-0 min-w-56"
                    >
                        <Tooltip title="Filter cases by selected Standard Results" enterDelay="medium">
                            <TagPicker
                                className="bg-white"
                                placeholder="Filter cases by Standard Results..."
                                selection={selectedStandardResults}
                                tagOptions={casesStandardResults.map((elm) => ({ label: elm, value: elm }))}
                                onChange={(value) => setSelectedStandardResults([...value])}
                            />
                        </Tooltip>
                    </PendingWrapper>
                </div>
            </div>
            <StatusWrapper
                className="grow min-h-0"
                errorMessage={casesQuery.isError ? "Error loading cases" : undefined}
            >
                <div className="flex flex-col h-full">
                    <div className="flex justify-end gap-4 items-center mb-1">
                        <div className="grow flex flex-col">
                            <span className="text-sm text-slate-500">Select from {numberOfCases} cases</span>
                            <span className="text-xs text-slate-400 italic">
                                Last updated:{" "}
                                {lastUpdatedMs ? (
                                    <TimeAgo datetimeMs={lastUpdatedMs} updateIntervalMs={10000} />
                                ) : casesQuery.isFetching ? (
                                    "Loading..."
                                ) : (
                                    "Never"
                                )}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <Tooltip title="Refresh fields and cases lists" enterDelay="medium">
                                <Button color="primary" onClick={handleManualRefetch} size="medium">
                                    {isFieldsQueryRefreshing || isCasesQueryRefreshing ? (
                                        <CircularProgress size="small" />
                                    ) : (
                                        <Refresh fontSize="inherit" />
                                    )}
                                    Refresh
                                </Button>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="grow min-h-0">
                        <Table
                            rowIdentifier="caseId"
                            height={"100%"}
                            rowHeight={38}
                            numPendingRows={!sortedCasesQueryData ? "fill" : undefined}
                            columns={caseTableColumns}
                            rows={caseRowData}
                            selectable
                            multiColumnSort
                            selectedRows={selectedCaseUuid ? [selectedCaseUuid] : []}
                            filters={tableFiltersState}
                            sorting={tableSortingState}
                            onSelectedRowsChange={(caseIds) => setSelectedCaseUuid(caseIds[0] ?? null)}
                            onFiltersChange={setTableFiltersState}
                            onSortingChange={setTableSortingState}
                            onDataCollated={(data) => setNumberOfCases(data.length)}
                        />
                    </div>
                </div>
            </StatusWrapper>
        </div>
    );
}
