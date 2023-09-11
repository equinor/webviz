import React from "react";

import { CaseInfo_api, EnsembleInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";
import { useQuery } from "@tanstack/react-query";

import { isEqual } from "lodash";

export type EnsembleItem = {
    caseUuid: string;
    caseName: string;
    ensembleName: string;
};

export type SelectEnsemblesDialogProps = {
    onClose: (selectedEnsembleIdents: EnsembleItem[] | null) => void;
    selectedEnsembles: EnsembleItem[];
};

const STALE_TIME = 0;
const CACHE_TIME = 5 * 60 * 1000;

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [confirmCancel, setConfirmCancel] = React.useState<boolean>(false);
    const [newlySelectedEnsembles, setNewlySelectedEnsembles] = React.useState<EnsembleItem[]>([]);

    React.useLayoutEffect(() => {
        setNewlySelectedEnsembles(props.selectedEnsembles);
    }, [props.selectedEnsembles]);

    const fieldsQuery = useQuery({
        queryKey: ["getFields"],
        queryFn: () => {
            return apiService.explore.getFields();
        },
    });

    const [selectedField, setSelectedField] = useValidState<string>(
        "",
        [fieldsQuery.data ?? [], (item) => item.field_identifier],
        true
    );

    const casesQuery = useQuery({
        queryKey: ["getCases", selectedField],
        queryFn: () => {
            if (!selectedField) {
                return Promise.resolve<CaseInfo_api[]>([]);
            }
            return apiService.explore.getCases(selectedField);
        },
        enabled: fieldsQuery.isSuccess,
        cacheTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [selectedCaseId, setSelectedCaseId] = useValidState<string>(
        "",
        [casesQuery.data ?? [], (item) => item.uuid],
        true
    );

    const ensemblesQuery = useQuery({
        queryKey: ["getEnsembles", selectedCaseId],
        queryFn: () => {
            if (!selectedCaseId) {
                return Promise.resolve<EnsembleInfo_api[]>([]);
            }
            return apiService.explore.getEnsembles(selectedCaseId);
        },
        enabled: casesQuery.isSuccess,
        cacheTime: CACHE_TIME,
        staleTime: STALE_TIME,
    });

    const [selectedEnsembleName, setSelectedEnsembleName] = useValidState<string>(
        "",
        [ensemblesQuery.data ?? [], (el) => el.name],
        true
    );

    function handleFieldChanged(fieldIdentifier: string) {
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
            const ensArr = [{ caseUuid: selectedCaseId, caseName: caseName, ensembleName: selectedEnsembleName }];
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
        props.onClose(null);
    }

    function handleCancel() {
        if (isEqual(props.selectedEnsembles, newlySelectedEnsembles)) {
            handleClose();
            return;
        }
        setConfirmCancel(true);
    }

    function handleApplyEnsembleSelection() {
        props.onClose(newlySelectedEnsembles);
    }

    function checkIfAnyChanges(): boolean {
        return !isEqual(props.selectedEnsembles, newlySelectedEnsembles);
    }

    const fieldOpts = fieldsQuery.data?.map((f) => ({ value: f.field_identifier, label: f.field_identifier })) ?? [];
    const caseOpts = casesQuery.data?.map((c) => ({ value: c.uuid, label: c.name })) ?? [];
    const ensembleOpts =
        ensemblesQuery.data?.map((e) => ({ value: e.name, label: `${e.name}  (${e.realization_count} reals)` })) ?? [];

    const ensembleAlreadySelected = checkIfEnsembleAlreadySelected();

    return (
        <>
            <Dialog
                open={true}
                onClose={handleCancel}
                title="Select ensembles"
                modal
                width={"75%"}
                actions={
                    <div className="flex gap-4">
                        <Button onClick={handleClose} color="danger" disabled={!checkIfAnyChanges()}>
                            Discard changes
                        </Button>
                        <Button onClick={handleApplyEnsembleSelection} disabled={!checkIfAnyChanges()}>
                            Apply changes
                        </Button>
                    </div>
                }
                showCloseCross
            >
                <div className="flex gap-4 max-w-full">
                    <div className="flex flex-col gap-4 p-4 border-r bg-slate-100 h-full">
                        <Label text="Field">
                            <ApiStateWrapper
                                apiResult={fieldsQuery}
                                errorComponent={<div className="text-red-500">Error loading fields</div>}
                                loadingComponent={<CircularProgress />}
                            >
                                <Dropdown
                                    options={fieldOpts}
                                    value={selectedField}
                                    onChange={handleFieldChanged}
                                    disabled={fieldOpts.length === 0}
                                />
                            </ApiStateWrapper>
                        </Label>
                        <Label text="Case">
                            <ApiStateWrapper
                                apiResult={casesQuery}
                                errorComponent={<div className="text-red-500">Error loading cases</div>}
                                loadingComponent={<CircularProgress />}
                            >
                                <Select
                                    options={caseOpts}
                                    value={[selectedCaseId]}
                                    onChange={handleCaseChanged}
                                    disabled={caseOpts.length === 0}
                                    size={5}
                                    width={400}
                                    filter
                                />
                            </ApiStateWrapper>
                        </Label>
                        <Label text="Ensemble">
                            <ApiStateWrapper
                                apiResult={ensemblesQuery}
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
                            </ApiStateWrapper>
                        </Label>
                        <div className="flex justify-end">
                            <Button
                                variant="contained"
                                onClick={handleAddEnsemble}
                                color={ensembleAlreadySelected ? "success" : "primary"}
                                disabled={ensembleAlreadySelected || ensembleOpts.length === 0}
                                startIcon={
                                    ensembleAlreadySelected ? (
                                        <CheckIcon className="w-5 h-5" />
                                    ) : (
                                        <PlusIcon className="w-5 h-5" />
                                    )
                                }
                            >
                                {ensembleAlreadySelected ? "Ensemble already selected" : "Add Ensemble"}
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col flex-grow gap-4 p-4">
                        <Label text="Selected Ensembles">
                            <table className="w-full border border-collapse table-fixed">
                                <thead>
                                    <tr>
                                        <th className="min-w-1/2 text-left p-2 bg-slate-300">Case</th>
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
                                                >
                                                    <TrashIcon className="w-5 h-5" />
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
