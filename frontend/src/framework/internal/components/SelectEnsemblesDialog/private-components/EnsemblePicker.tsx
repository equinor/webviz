import React from "react";

import { Add, Check } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import type { CaseInfo_api } from "@api";
import { getCasesOptions, getEnsemblesOptions, getFieldsOptions } from "@api";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { tanstackDebugTimeOverride } from "@framework/internal/utils/debug";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import type { TableSelectOption } from "@lib/components/TableSelect";
import { TableSelect } from "@lib/components/TableSelect";
import { useValidState } from "@lib/hooks/useValidState";

import { isSameEnsembleItem } from "../_utils";
import type { BaseEnsembleItem, RegularEnsembleItem } from "../types";

import { UserAvatar } from "./userAvatar";

export type EnsemblePickerProps = {
    nextEnsembleColor: string;
    selectedEnsembles: RegularEnsembleItem[];
    onAddEnsemble: (newEnsemble: RegularEnsembleItem) => void;
};

const STALE_TIME = tanstackDebugTimeOverride(0);
const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

interface CaseFilterSettings {
    keep: boolean;
    onlyMyCases: boolean;
    users: string[];
}

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

    // Field select
    const fieldsQuery = useQuery({ ...getFieldsOptions() });

    const fieldOpts = fieldsQuery.data?.map((f) => ({ value: f.field_identifier, label: f.field_identifier })) ?? [];
    const [selectedField, setSelectedField] = useValidState<string>({
        initialState: readInitialStateFromLocalStorage("selectedField"),
        validStates: fieldsQuery.data?.map((item) => item.field_identifier) ?? [],
        keepStateWhenInvalid: true,
    });

    // Case select
    const casesQuery = useQuery({
        ...getCasesOptions({ query: { field_identifier: selectedField } }),
        enabled: fieldsQuery.isSuccess,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [casesFilteringOptions, setCasesFilteringOptions] = React.useState<CaseFilterSettings>({
        keep: !(readInitialStateFromLocalStorage("showKeepCases") === "false"),
        onlyMyCases: readInitialStateFromLocalStorage("showOnlyMyCases") === "true",
        users: [],
    });

    function handleKeepCasesSwitchChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCasesFilteringOptions((prev) => ({ ...prev, keep: e.target.checked }));
        storeStateInLocalStorage("showKeepCases", e.target.checked.toString());
    }

    function handleCasesByMeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCasesFilteringOptions((prev) => ({ ...prev, onlyMyCases: e.target.checked }));
        storeStateInLocalStorage("showOnlyMyCases", e.target.checked.toString());
    }

    function filterCases(cases: CaseInfo_api[] | undefined): CaseInfo_api[] | undefined {
        if (!cases) {
            return cases;
        }
        let filteredCases = cases;
        if (casesFilteringOptions.keep) {
            filteredCases = filteredCases.filter((c) => c.status === "keep");
        }
        if (casesFilteringOptions.onlyMyCases) {
            filteredCases = filteredCases.filter(
                (c) => c.user.toLowerCase() === userInfo?.username.replace("@equinor.com", "").toLowerCase(),
            );
        } else if (casesFilteringOptions.users.length > 0) {
            filteredCases = filteredCases.filter((c) => casesFilteringOptions.users.includes(c.user));
        }
        return filteredCases;
    }

    const caseOpts: TableSelectOption[] =
        filterCases(casesQuery.data)?.map((el) => ({
            id: el.uuid,
            values: [
                { label: el.name },
                { label: el.user, adornment: <UserAvatar key={el.uuid} userId={el.user} /> },
                { label: el.status },
            ],
        })) ?? [];

    const [selectedCaseId, setSelectedCaseId] = useValidState<string>({
        initialState: "",
        validStates: filterCases(casesQuery.data)?.map((item) => item.uuid) ?? [],
        keepStateWhenInvalid: true,
    });

    // Ensemble select
    const ensemblesQuery = useQuery({
        ...getEnsemblesOptions({
            path: {
                case_uuid: selectedCaseId,
            },
        }),
        enabled: casesQuery.isSuccess,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });
    const [selectedEnsembleName, setSelectedEnsembleName] = useValidState<string>({
        initialState: "",
        validStates: ensemblesQuery.data?.map((el) => el.name) ?? [],
        keepStateWhenInvalid: true,
    });

    const ensembleOpts =
        ensemblesQuery.data?.map((e) => ({
            label: `${e.name}  (${e.realization_count} reals)`,
            value: e.name,
        })) ?? [];

    const selectedEnsembleItem = React.useMemo<BaseEnsembleItem>(() => {
        return { caseUuid: selectedCaseId, ensembleName: selectedEnsembleName };
    }, [selectedCaseId, selectedEnsembleName]);

    const ensembleAlreadySelected = React.useMemo(() => {
        return (
            selectedCaseId &&
            selectedEnsembleName &&
            props.selectedEnsembles.some((e) => isSameEnsembleItem(e, selectedEnsembleItem))
        );
    }, [props.selectedEnsembles, selectedCaseId, selectedEnsembleItem, selectedEnsembleName]);

    function handleFieldChanged(fieldIdentifier: string) {
        storeStateInLocalStorage("selectedField", fieldIdentifier);
        setSelectedField(fieldIdentifier);
    }

    function handleCaseChanged(caseUuids: string[]) {
        setSelectedCaseId(caseUuids[0]);
    }

    function handleRegularEnsembleChanged(ensembleNames: string[]) {
        setSelectedEnsembleName(ensembleNames[0]);
    }

    function handleAddRegularEnsemble() {
        if (ensembleAlreadySelected) return;

        const caseName = casesQuery.data?.find((c) => c.uuid === selectedCaseId)?.name ?? "UNKNOWN";

        props.onAddEnsemble({
            caseUuid: selectedCaseId,
            caseName: caseName,
            ensembleName: selectedEnsembleName,
            color: props.nextEnsembleColor,
            customName: null,
        });
    }

    return (
        <div className="flex flex-col gap-4 p-4 border-r bg-slate-100 h-full">
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
                    <div className="flex justify-end gap-4 items-center">
                        <span className="grow text-sm text-slate-500">Select from {caseOpts.length} cases</span>
                        <Label position="right" text="Keep" title="Show only cases marked as keep">
                            <Switch checked={casesFilteringOptions.keep} onChange={handleKeepCasesSwitchChange} />
                        </Label>
                        <Label position="right" text="My cases" title="Show only my cases">
                            <Switch checked={casesFilteringOptions.onlyMyCases} onChange={handleCasesByMeChange} />
                        </Label>
                    </div>
                    <TableSelect
                        headerLabels={["Name", "Author", "Status"]}
                        options={caseOpts}
                        value={[selectedCaseId]}
                        onChange={handleCaseChanged}
                        disabled={caseOpts.length === 0}
                        size={5}
                        width={400}
                        filter
                        columnSizesInPercent={[60, 20, 20]}
                    />
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
                        disabled={caseOpts.length === 0}
                        size={5}
                        width="100%"
                    />
                </QueryStateWrapper>
            </Label>
            <div className="flex justify-end">
                <Button
                    variant="contained"
                    onClick={handleAddRegularEnsemble}
                    color={ensembleAlreadySelected ? "success" : "primary"}
                    disabled={ensembleAlreadySelected || ensembleOpts.length === 0}
                    startIcon={ensembleAlreadySelected ? <Check fontSize="small" /> : <Add fontSize="small" />}
                >
                    {ensembleAlreadySelected ? "Ensemble already selected" : "Add Ensemble"}
                </Button>
            </div>
        </div>
    );
}
