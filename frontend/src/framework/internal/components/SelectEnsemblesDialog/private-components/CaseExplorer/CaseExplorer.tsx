import React from "react";

import { CircularProgress } from "@equinor/eds-core-react";
import { useQuery } from "@tanstack/react-query";
import { isEqual } from "lodash";

import { getCasesOptions, getFieldsOptions, type EnsembleInfo_api } from "@api";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { tanstackDebugTimeOverride } from "@framework/internal/utils/debug";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
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

const STALE_TIME = tanstackDebugTimeOverride(0);
const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

export type CaseSelection = {
    caseName: string;
    caseUuid: string;
    filteredEnsembles: EnsembleInfo_api[] | null;
};

export type CaseExplorerProps = {
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

    // Keep the prevCaseSelection state that was already defined
    const [prevCaseSelection, setPrevCaseSelection] = React.useState<CaseSelection | null>(null);

    // --- Queries ---
    const fieldsQuery = useQuery({ ...getFieldsOptions() });
    const fieldOptions = fieldsQuery.data?.map((f) => ({ value: f.fieldIdentifier, label: f.fieldIdentifier })) ?? [];

    const [selectedField, setSelectedField] = useValidState<string>({
        initialState: readInitialStateFromLocalStorage("selectedField"),
        validStates: fieldsQuery.data?.map((item) => item.fieldIdentifier) ?? [],
        keepStateWhenInvalid: true,
    });

    const casesQuery = useQuery({
        ...getCasesOptions({ query: { field_identifier: selectedField ?? "" } }),
        enabled: selectedField !== null,
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

    return (
        <div className="flex flex-col h-full gap-4 min-h-0">
            <div className="flex flex-row gap-4">
                <Label text="Field" position="left">
                    <QueryStateWrapper
                        queryResult={fieldsQuery}
                        errorComponent={<div className="text-red-500">Error loading fields</div>}
                        loadingComponent={<CircularProgress />}
                    >
                        <Dropdown
                            options={fieldOptions}
                            value={selectedField}
                            onChange={handleFieldChanged}
                            disabled={fieldOptions.length === 0}
                        />
                    </QueryStateWrapper>
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
                    <QueryStateWrapper
                        queryResult={casesQuery}
                        className="h-full flex-1 min-h-0 min-w-56"
                        errorComponent={<div className="text-red-500">Error loading cases</div>}
                        loadingComponent={<CircularProgress />}
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
                    </QueryStateWrapper>
                </div>
            </div>
            <StatusWrapper
                className="grow min-h-0"
                errorMessage={casesQuery.isError ? "Error loading cases" : undefined}
            >
                <div className="flex flex-col h-full">
                    <div className="flex justify-end gap-4 items-center">
                        <span className="grow text-sm text-slate-500">Select from {numberOfCases} cases</span>
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
