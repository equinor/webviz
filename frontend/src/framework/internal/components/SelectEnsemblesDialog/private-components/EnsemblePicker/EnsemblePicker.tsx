import React from "react";

import { Add, Check } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { isEqual } from "lodash";

import { getCasesOptions, getEnsemblesOptions, getFieldsOptions } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { tanstackDebugTimeOverride } from "@framework/internal/utils/debug";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import { Table } from "@lib/components/Table";
import type { TableFilters } from "@lib/components/Table/types";
import { TagPicker } from "@lib/components/TagPicker";
import { useValidState } from "@lib/hooks/useValidState";

import type { InternalRegularEnsembleSetting } from "../../types";

import { makeCaseRowData, makeCaseTableColumns } from "./_utils";

export type EnsemblePickerProps = {
    nextEnsembleColor: string;
    selectedEnsembles: UserEnsembleSetting[];
    pickButtonLabel?: string;
    onPickEnsemble: (newEnsemble: InternalRegularEnsembleSetting) => void;
};

const STALE_TIME = tanstackDebugTimeOverride(0);
const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

function readInitialStateFromLocalStorage(stateName: string): string {
    const storedState = localStorage.getItem(stateName);
    if (storedState && typeof storedState === "string") {
        return storedState;
    }
    return "";
}

function storeStateInLocalStorage(stateName: string, value: string) {
    localStorage.setItem(stateName, value);
}

export function EnsemblePicker(props: EnsemblePickerProps): React.ReactNode {
    const { userInfo } = useAuthProvider();

    const userName = React.useMemo(() => {
        return userInfo?.username.replace("@equinor.com", "").toLowerCase() ?? "";
    }, [userInfo]);

    const [currentStatusOptions, setCurrentStatusOptions] = React.useState<string[]>([]);
    const [selectedStandardResults, setSelectedStandardResults] = React.useState<string[]>([]);
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

    // Field select
    const fieldsQuery = useQuery({ ...getFieldsOptions() });

    const fieldOpts = fieldsQuery.data?.map((f) => ({ value: f.fieldIdentifier, label: f.fieldIdentifier })) ?? [];
    const [selectedField, setSelectedField] = useValidState<string>({
        initialState: readInitialStateFromLocalStorage("selectedField"),
        validStates: fieldsQuery.data?.map((item) => item.fieldIdentifier) ?? [],
        keepStateWhenInvalid: true,
    });

    // Case select
    const casesQuery = useQuery({
        ...getCasesOptions({ query: { field_identifier: selectedField } }),
        enabled: fieldsQuery.isSuccess,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    // Extract unique status options from cases data when it's available
    if (casesQuery.data) {
        const uniqueStatuses = [...new Set(casesQuery.data.map((c) => c.status))];
        if (!isEqual(uniqueStatuses, currentStatusOptions)) {
            setCurrentStatusOptions(uniqueStatuses);
        }
    }

    const caseStandardResults = React.useMemo(() => {
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
    }, [casesQuery]);

    const caseRowData = React.useMemo(() => {
        if (!casesQuery.data) {
            // TODO: Return loading rows?
            return [];
        }

        let cases = casesQuery.data;
        if (selectedStandardResults.length > 0) {
            cases = cases.filter((c) =>
                c.ensembles.some((ens) => ens.standardResults.some((res) => selectedStandardResults.includes(res))),
            );
        }

        return makeCaseRowData(cases);
    }, [casesQuery, selectedStandardResults]);

    const [selectedCaseUuid, setSelectedCaseId] = useValidState<string>({
        initialState: "",
        validStates: casesQuery.data?.map((item) => item.uuid) ?? [],
        keepStateWhenInvalid: true,
    });

    const selectedCase = React.useMemo(() => {
        const cases = casesQuery.data ?? [];
        return cases.find((c) => c.uuid === selectedCaseUuid);
    }, [casesQuery.data, selectedCaseUuid]);

    // Ensemble select
    const ensemblesQuery = useQuery({
        ...getEnsemblesOptions({
            query: { t: selectedCase?.updatedAtUtcMs },
            path: {
                case_uuid: selectedCaseUuid,
            },
        }),
        enabled: casesQuery.isSuccess && !!selectedCase,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [selectedEnsembleName, setSelectedEnsembleName] = useValidState<string>({
        initialState: "",
        validStates: ensemblesQuery.data?.map((el) => el.name) ?? [],
        keepStateWhenInvalid: true,
    });

    const selectedEnsemble = React.useMemo(() => {
        const ensembles = ensemblesQuery.data ?? [];
        return ensembles.find((ens) => ens.name === selectedEnsembleName);
    }, [ensemblesQuery.data, selectedEnsembleName]);

    const ensembleOpts =
        ensemblesQuery.data?.map((e) => ({
            label: `${e.name}  (${e.realizationCount} reals)`,
            value: e.name,
        })) ?? [];

    let selectedEnsembleIdent: RegularEnsembleIdent | null = null;
    try {
        selectedEnsembleIdent = new RegularEnsembleIdent(selectedCaseUuid, selectedEnsembleName);
    } catch (_e) {
        selectedEnsembleIdent = null;
    }
    const ensembleAlreadySelected =
        selectedCaseUuid &&
        selectedEnsembleName &&
        props.selectedEnsembles.some((el) => el.ensembleIdent.equals(selectedEnsembleIdent));

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

    function handleFieldChanged(fieldIdentifier: string) {
        storeStateInLocalStorage("selectedField", fieldIdentifier);
        setSelectedField(fieldIdentifier);
    }

    function handleFilterByStandardResultsChange(selected: string[]) {
        setSelectedStandardResults(selected);
    }

    function handleOnSelectRowsChange(caseIds: string[]) {
        setSelectedCaseId((prev) => caseIds?.[0] ?? prev);
    }

    function handleFiltersChange(newValue: TableFilters) {
        setTableFiltersState(newValue);
    }

    function handleRegularEnsembleChanged(ensembleNames: string[]) {
        setSelectedEnsembleName(ensembleNames[0]);
    }

    function handleSelectRegularEnsemble() {
        if (ensembleAlreadySelected) return;
        if (!selectedEnsemble) return;

        const caseName = casesQuery.data?.find((c) => c.uuid === selectedCaseUuid)?.name ?? "UNKNOWN";

        props.onPickEnsemble({
            ensembleIdent: new RegularEnsembleIdent(selectedCaseUuid, selectedEnsembleName),
            caseName: caseName,
            color: props.nextEnsembleColor,
            customName: null,
            timestamps: selectedEnsemble.timestamps,
        });
    }

    return (
        <div className="flex flex-col gap-4 p-4 border-r bg-slate-100 h-full rounded-md">
            <Label text="Field">
                <QueryStateWrapper
                    queryResult={fieldsQuery}
                    errorComponent={<div className="text-red-500">Error loading fields</div>}
                    loadingComponent={<CircularProgress />}
                >
                    <Dropdown
                        options={fieldOpts}
                        value={selectedField}
                        onChange={handleFieldChanged}
                        disabled={fieldOpts.length === 0}
                    />
                </QueryStateWrapper>
            </Label>
            <Label text="Case">
                <QueryStateWrapper
                    queryResult={casesQuery}
                    errorComponent={<div className="text-red-500">Error loading cases</div>}
                    loadingComponent={<CircularProgress />}
                >
                    <div className="flex flex-col gap-4">
                        <TagPicker
                            placeholder="Filter by Standard Results..."
                            tags={caseStandardResults.map((elm) => ({ label: elm, value: elm }))}
                            value={selectedStandardResults}
                            onChange={handleFilterByStandardResultsChange}
                        />
                        <div className="flex justify-end gap-4 items-center">
                            <span className="grow text-sm text-slate-500">Select from {caseRowData.length} cases</span>
                            <Label position="right" text="Official" title="Show only cases marked as official">
                                <Switch checked={showOnlyOfficialCases} onChange={handleOfficialCasesSwitchChange} />
                            </Label>
                            <Label position="right" text="My cases" title="Show only my cases">
                                <Switch checked={showOnlyMyCases} onChange={handleCasesByMeChange} />
                            </Label>
                        </div>
                        <Table
                            rowIdentifier="caseId"
                            height={500}
                            columns={caseTableColumns}
                            rows={caseRowData}
                            selectedRows={["selectedCaseUuid"]}
                            filters={tableFiltersState}
                            selectable
                            onSelectedRowsChange={handleOnSelectRowsChange}
                            onFiltersChange={handleFiltersChange}
                        />
                    </div>
                </QueryStateWrapper>
            </Label>
            <Label text="Ensemble">
                <QueryStateWrapper
                    queryResult={ensemblesQuery}
                    errorComponent={<div className="text-red-500">Error loading ensembles</div>}
                    loadingComponent={<CircularProgress />}
                >
                    <Select
                        options={ensembleOpts}
                        value={[selectedEnsembleName]}
                        onChange={handleRegularEnsembleChanged}
                        disabled={caseRowData.length === 0}
                        size={5}
                        width="100%"
                    />
                </QueryStateWrapper>
            </Label>
            <div className="flex justify-end">
                <Button
                    variant="contained"
                    onClick={handleSelectRegularEnsemble}
                    color={ensembleAlreadySelected ? "success" : "primary"}
                    disabled={ensembleAlreadySelected || ensembleOpts.length === 0}
                    startIcon={ensembleAlreadySelected ? <Check fontSize="small" /> : <Add fontSize="small" />}
                >
                    {ensembleAlreadySelected
                        ? "Ensemble already selected"
                        : (props.pickButtonLabel ?? "Select Ensemble")}
                </Button>
            </div>
        </div>
    );
}
