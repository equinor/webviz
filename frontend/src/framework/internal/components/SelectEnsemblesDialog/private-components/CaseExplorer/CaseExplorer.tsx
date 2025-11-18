import React from "react";

import { Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { isEqual } from "lodash";

import { getCasesOptions, getFieldsOptions, type EnsembleInfo_api } from "@api";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { tanstackDebugTimeOverride } from "@framework/internal/utils/debug";
import { CircularProgress } from "@lib/components/CircularProgress";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { Switch } from "@lib/components/Switch";
import { Table } from "@lib/components/Table";
import type { TableFilters } from "@lib/components/Table/types";
import { TagPicker } from "@lib/components/TagPicker";
import { Tooltip } from "@lib/components/Tooltip";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { useValidState } from "@lib/hooks/useValidState";

import {
    makeCaseRowData,
    makeCaseTableColumns,
    readInitialStateFromLocalStorage,
    storeStateInLocalStorage,
} from "./_utils";

const STALE_TIME = tanstackDebugTimeOverride(5 * 60);
const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

export type CaseSelection = {
    caseName: string;
    caseUuid: string;
    filteredEnsembles: EnsembleInfo_api[] | null;
};

export type CaseExplorerProps = {
    disableQueries: boolean;
    onCaseSelectionChange: (caseSelection: CaseSelection) => void;
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
    const [isManualRefetch, setIsManualRefetch] = React.useState<boolean>(false);
    const [isRefreshAnimationPlaying, setIsRefreshAnimationPlaying] = React.useState<boolean>(false);

    // Keep the prevCaseSelection state that was already defined
    const [prevCaseSelection, setPrevCaseSelection] = React.useState<CaseSelection | null>(null);

    // --- Queries ---
    const fieldsQuery = useQuery({
        ...getFieldsOptions(),
        enabled: !props.disableQueries,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
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
    });

    const [selectedCaseUuid, setSelectedCaseId] = useValidState<string>({
        initialState: "",
        validStates: casesQuery.data?.map((item) => item.uuid) ?? [],
        keepStateWhenInvalid: true,
    });

    // Handle manual refresh animation
    React.useEffect(
        function handleManualRefreshAnimation() {
            // Reset states when queries are disabled
            if (props.disableQueries) {
                setIsManualRefetch(false);
                setIsRefreshAnimationPlaying(false);
                return;
            }

            // Delayed stop of animation when refetch is done
            if (isManualRefetch && !casesQuery.isRefetching) {
                setIsManualRefetch(false);
                setTimeout(function stopRefreshAnimation() {
                    setIsRefreshAnimationPlaying(false);
                }, 500);
            }
        },
        [isManualRefetch, casesQuery.isRefetching, props.disableQueries],
    );

    // --- Derived data ---
    const lastUpdated = React.useMemo(() => {
        return casesQuery.data && casesQuery.dataUpdatedAt ? new Date(casesQuery.dataUpdatedAt) : null;
    }, [casesQuery.data, casesQuery.dataUpdatedAt]);

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
            // isFetching covers both fetching and re-fetching state
            if (casesQuery.isFetching || props.disableQueries) return;

            setIsManualRefetch(true);
            setIsRefreshAnimationPlaying(true);

            casesQuery.refetch();
        },
        [casesQuery, props.disableQueries],
    );

    return (
        <div className="flex flex-col h-full gap-4 min-h-0">
            <div className="flex flex-row gap-4">
                <Label text="Field" position="left">
                    <PendingWrapper
                        isPending={fieldsQuery.isFetching}
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
                            <span className="text-xs text-slate-400">
                                Last updated: {lastUpdated?.toLocaleTimeString() ?? ""}
                            </span>
                        </div>
                        <div className="flex flex-row items-center">
                            <span className="text-sm text-slate-500">Refresh cases</span>
                            <Tooltip title="Refresh cases list" enterDelay="medium">
                                <DenseIconButton
                                    onClick={handleManualRefetch}
                                    disabled={props.disableQueries || selectedField === null}
                                >
                                    {isRefreshAnimationPlaying ? (
                                        <CircularProgress size="medium-small" color="fill-indigo-800" />
                                    ) : (
                                        <Refresh fontSize="small" className="text-indigo-800" />
                                    )}
                                </DenseIconButton>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="grow min-h-0">
                        <Table
                            rowIdentifier="caseId"
                            height={"100%"}
                            rowHeight={38}
                            numPendingRows={!casesQuery.data ? "fill" : undefined}
                            columns={caseTableColumns}
                            rows={caseRowData}
                            selectedRows={[selectedCaseUuid]}
                            filters={tableFiltersState}
                            selectable
                            onSelectedRowsChange={(caseIds) => setSelectedCaseId((prev) => caseIds[0] ?? prev)}
                            onFiltersChange={setTableFiltersState}
                            onDataCollated={(data) => setNumberOfCases(data.length)}
                        />
                    </div>
                </div>
            </StatusWrapper>
        </div>
    );
}
