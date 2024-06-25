import React from "react";

import { CaseInfo_api, EnsembleInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { useAuthProvider } from "@framework/internal/providers/AuthProvider";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ColorSelect } from "@lib/components/ColorSelect";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import { TableSelect, TableSelectOption } from "@lib/components/TableSelect";
import { useValidState } from "@lib/hooks/useValidState";
import { ColorSet } from "@lib/utils/ColorSet";
import { Add, Check, Remove } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { UserAvatar } from "./private-components/userAvatar";

import { LoadingOverlay } from "../LoadingOverlay";

export type EnsembleItem = {
    caseUuid: string;
    caseName: string;
    ensembleName: string;
    color: string;
    customName: string | null;
};

export type SelectEnsemblesDialogProps = {
    loadAndSetupEnsembles: (selectedEnsembles: EnsembleItem[]) => Promise<void>;
    onClose: () => void;
    selectedEnsembles: EnsembleItem[];
    colorSet: ColorSet;
};

const STALE_TIME = 0;
const CACHE_TIME = 5 * 60 * 1000;

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

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [isLoadingEnsembles, setIsLoadingEnsembles] = React.useState<boolean>(false);
    const [confirmCancel, setConfirmCancel] = React.useState<boolean>(false);
    const [newlySelectedEnsembles, setNewlySelectedEnsembles] = React.useState<EnsembleItem[]>([]);
    const [casesFilteringOptions, setCasesFilteringOptions] = React.useState<CaseFilterSettings>({
        keep: true,
        onlyMyCases: false,
        users: [],
    });

    const { userInfo } = useAuthProvider();

    React.useLayoutEffect(() => {
        setNewlySelectedEnsembles(props.selectedEnsembles);
    }, [props.selectedEnsembles]);

    const fieldsQuery = useQuery({
        queryKey: ["getFields"],
        queryFn: () => {
            return apiService.explore.getFields();
        },
    });

    const [selectedField, setSelectedField] = useValidState<string>({
        initialState: readInitialStateFromLocalStorage("selectedField"),
        validStates: fieldsQuery.data?.map((item) => item.field_identifier) ?? [],
        keepStateWhenInvalid: true,
    });

    const casesQuery = useQuery({
        queryKey: ["getCases", selectedField],
        queryFn: () => {
            if (!selectedField) {
                return Promise.resolve<CaseInfo_api[]>([]);
            }
            return apiService.explore.getCases(selectedField);
        },
        enabled: fieldsQuery.isSuccess,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [selectedCaseId, setSelectedCaseId] = useValidState<string>({
        initialState: "",
        validStates: filterCases(casesQuery.data)?.map((item) => item.uuid) ?? [],
        keepStateWhenInvalid: true,
    });

    const ensemblesQuery = useQuery({
        queryKey: ["getEnsembles", selectedCaseId],
        queryFn: () => {
            if (!selectedCaseId) {
                return Promise.resolve<EnsembleInfo_api[]>([]);
            }
            return apiService.explore.getEnsembles(selectedCaseId);
        },
        enabled: casesQuery.isSuccess,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [selectedEnsembleName, setSelectedEnsembleName] = useValidState<string>({
        initialState: "",
        validStates: ensemblesQuery.data?.map((el) => el.name) ?? [],
        keepStateWhenInvalid: true,
    });

    function handleFieldChanged(fieldIdentifier: string) {
        storeStateInLocalStorage("selectedField", fieldIdentifier);
        setSelectedField(fieldIdentifier);
    }

    function handleCaseChanged(caseUuids: string[]) {
        setSelectedCaseId(caseUuids[0]);
    }

    function handleEnsembleChanged(ensembleNames: string[]) {
        setSelectedEnsembleName(ensembleNames[0]);
    }

    function checkIfEnsembleAlreadySelected(): boolean {
        if (selectedCaseId && selectedEnsembleName) {
            if (
                newlySelectedEnsembles.some(
                    (e) => e.caseUuid === selectedCaseId && e.ensembleName === selectedEnsembleName
                )
            ) {
                return true;
            }
        }
        return false;
    }

    function handleAddEnsemble() {
        if (!checkIfEnsembleAlreadySelected()) {
            const caseName = casesQuery.data?.find((c) => c.uuid === selectedCaseId)?.name ?? "UNKNOWN";
            const ensArr = [
                {
                    caseUuid: selectedCaseId,
                    caseName: caseName,
                    ensembleName: selectedEnsembleName,
                    color: props.colorSet.getColor(newlySelectedEnsembles.length),
                    customName: null,
                },
            ];
            setNewlySelectedEnsembles((prev) => [...prev, ...ensArr]);
        }
    }

    function handleRemoveEnsemble(caseUuid: string, ensembleName: string) {
        setNewlySelectedEnsembles((prev) => [
            ...prev.filter((e) => e.caseUuid !== caseUuid || e.ensembleName !== ensembleName),
        ]);
    }

    function handleClose() {
        setConfirmCancel(false);
        props.onClose();
    }

    function handleCancel() {
        if (isEqual(props.selectedEnsembles, newlySelectedEnsembles)) {
            handleClose();
            return;
        }
        setConfirmCancel(true);
    }

    function handleApplyEnsembleSelection() {
        setIsLoadingEnsembles(true);
        props
            .loadAndSetupEnsembles(newlySelectedEnsembles)
            .then(() => {
                handleClose();
            })
            .finally(() => {
                setIsLoadingEnsembles(false);
            });
    }

    function checkIfAnyChanges(): boolean {
        return !isEqual(props.selectedEnsembles, newlySelectedEnsembles);
    }

    function handleKeepCasesSwitchChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCasesFilteringOptions((prev) => ({ ...prev, keep: e.target.checked }));
    }

    function handleCasesByMeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setCasesFilteringOptions((prev) => ({ ...prev, onlyMyCases: e.target.checked }));
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
                (c) => c.user.toLowerCase() === userInfo?.username.replace("@equinor.com", "").toLowerCase()
            );
        } else if (casesFilteringOptions.users.length > 0) {
            filteredCases = filteredCases.filter((c) => casesFilteringOptions.users.includes(c.user));
        }
        return filteredCases;
    }

    function handleColorChange(caseUuid: string, ensembleName: string, color: string) {
        setNewlySelectedEnsembles((prev) =>
            prev.map((e) => {
                if (e.caseUuid === caseUuid && e.ensembleName === ensembleName) {
                    return { ...e, color: color };
                }
                return e;
            })
        );
    }

    function handleEnsembleCustomNameChange(caseUuid: string, ensembleName: string, customName: string) {
        setNewlySelectedEnsembles((prev) => {
            return prev.map((e) => {
                if (e.caseUuid === caseUuid && e.ensembleName === ensembleName) {
                    return { ...e, customName: customName === "" ? null : customName };
                }
                return e;
            });
        });
    }

    const fieldOpts = fieldsQuery.data?.map((f) => ({ value: f.field_identifier, label: f.field_identifier })) ?? [];
    const caseOpts: TableSelectOption[] =
        filterCases(casesQuery.data)?.map((el) => ({
            id: el.uuid,
            values: [
                { label: el.name },
                { label: el.user, adornment: <UserAvatar key={el.uuid} userId={el.user} /> },
                { label: el.status },
            ],
        })) ?? [];
    const ensembleOpts =
        ensemblesQuery.data?.map((e) => ({ value: e.name, label: `${e.name}  (${e.realization_count} reals)` })) ?? [];

    const ensembleAlreadySelected = checkIfEnsembleAlreadySelected();

    function makeApplyButtonStartIcon() {
        if (isLoadingEnsembles) {
            return <CircularProgress size="small" />;
        }
        return <Check fontSize="small" />;
    }

    return (
        <>
            <Dialog
                open={true}
                onClose={handleCancel}
                title="Select ensembles"
                modal
                width={"75%"}
                minWidth={800}
                actions={
                    <div className="flex gap-4">
                        <Button
                            onClick={handleClose}
                            color="danger"
                            disabled={!checkIfAnyChanges() || isLoadingEnsembles}
                        >
                            Discard changes
                        </Button>
                        <Button
                            onClick={handleApplyEnsembleSelection}
                            disabled={!checkIfAnyChanges() || isLoadingEnsembles}
                            startIcon={makeApplyButtonStartIcon()}
                        >
                            {isLoadingEnsembles ? "Loading ensembles..." : "Apply"}
                        </Button>
                    </div>
                }
                showCloseCross
            >
                <div className="flex gap-4 max-w-full">
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
                                    <span className="flex-grow text-sm text-slate-500">
                                        Select from {caseOpts.length} cases
                                    </span>
                                    <Label position="right" text="Keep" title="Show only cases marked as keep">
                                        <Switch
                                            checked={casesFilteringOptions.keep}
                                            onChange={handleKeepCasesSwitchChange}
                                        />
                                    </Label>
                                    <Label position="right" text="My cases" title="Show only my cases">
                                        <Switch
                                            checked={casesFilteringOptions.onlyMyCases}
                                            onChange={handleCasesByMeChange}
                                        />
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
                                    onChange={handleEnsembleChanged}
                                    disabled={caseOpts.length === 0}
                                    size={5}
                                    width="100%"
                                />
                            </QueryStateWrapper>
                        </Label>
                        <div className="flex justify-end">
                            <Button
                                variant="contained"
                                onClick={handleAddEnsemble}
                                color={ensembleAlreadySelected ? "success" : "primary"}
                                disabled={ensembleAlreadySelected || ensembleOpts.length === 0}
                                startIcon={
                                    ensembleAlreadySelected ? <Check fontSize="small" /> : <Add fontSize="small" />
                                }
                            >
                                {ensembleAlreadySelected ? "Ensemble already selected" : "Add Ensemble"}
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col flex-grow gap-4 p-4">
                        <Label text="Selected Ensembles">
                            <table className="w-full border border-collapse table-fixed text-sm">
                                <thead>
                                    <tr>
                                        <th className="w-20 text-left p-2 bg-slate-300">Color</th>
                                        <th className="min-w-1/3 text-left p-2 bg-slate-300">Custom name</th>
                                        <th className="min-w-1/3 text-left p-2 bg-slate-300">Case</th>
                                        <th className="min-w-1/4 text-left p-2 bg-slate-300">Ensemble</th>
                                        <th className="w-20 text-left p-2 bg-slate-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {newlySelectedEnsembles.map((item) => (
                                        <tr
                                            key={`${item.caseName}-${item.ensembleName}`}
                                            className="hover:bg-slate-100 odd:bg-slate-50 align-center"
                                        >
                                            <td className="p-2">
                                                <ColorSelect
                                                    value={item.color}
                                                    onChange={(value) =>
                                                        handleColorChange(item.caseUuid, item.ensembleName, value)
                                                    }
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    placeholder="Give a custom name..."
                                                    defaultValue={item.customName ?? ""}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                        handleEnsembleCustomNameChange(
                                                            item.caseUuid,
                                                            item.ensembleName,
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="p-2">
                                                <div
                                                    className="text-ellipsis overflow-hidden whitespace-nowrap"
                                                    title={item.caseName}
                                                >
                                                    {item.caseName}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div
                                                    className="text-ellipsis overflow-hidden whitespace-nowrap"
                                                    title={item.ensembleName}
                                                >
                                                    {item.ensembleName}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <IconButton
                                                    onClick={() =>
                                                        handleRemoveEnsemble(item.caseUuid, item.ensembleName)
                                                    }
                                                    color="danger"
                                                    title="Remove ensemble from selection"
                                                >
                                                    <Remove fontSize="small" />
                                                </IconButton>{" "}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Label>
                        {newlySelectedEnsembles.length === 0 && (
                            <div className="text-gray-500">No ensembles selected.</div>
                        )}
                    </div>
                </div>
                {isLoadingEnsembles && <LoadingOverlay />}
            </Dialog>
            {
                <Dialog
                    open={confirmCancel}
                    onClose={() => setConfirmCancel(false)}
                    title="Unsaved changes"
                    modal
                    actions={
                        <div className="flex gap-4">
                            <Button onClick={() => setConfirmCancel(false)}>No, don&apos;t cancel</Button>
                            <Button onClick={handleClose} color="danger">
                                Yes, cancel
                            </Button>
                        </div>
                    }
                >
                    You have unsaved changes which will be lost. Are you sure you want to cancel?
                </Dialog>
            }
        </>
    );
};
