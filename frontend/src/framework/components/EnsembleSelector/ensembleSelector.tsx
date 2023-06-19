import React from "react";

import { CaseInfo, EnsembleInfo, FieldInfo } from "@api";
import { apiService } from "@framework/ApiService";
import { Workbench } from "@framework/Workbench";
import { TrashIcon } from "@heroicons/react/20/solid";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type EnsembleItem = {
    caseUuid: string;
    caseName: string;
    ensembleName: string;
};

export type EnsembleSelectorProps = {
    workbench: Workbench;
};

export const EnsembleSelector: React.FC<EnsembleSelectorProps> = (props) => {
    const [selectedField, setSelectedField] = React.useState<string>("");
    const [selectedCaseId, setSelectedCaseId] = React.useState<string>("");
    const [selectedEnsembleName, setSelectedEnsembleName] = React.useState<string>("");
    const [selectedEnsembles, setSelectedEnsembles] = React.useState<EnsembleItem[]>([]);

    const fieldsQuery = useQuery({
        queryKey: ["getFields"],
        queryFn: () => {
            return apiService.explore.getFields();
        },
    });

    const computedFieldIdentifier = fixupFieldIdentifier(selectedField, fieldsQuery.data);

    const casesQuery = useQuery({
        queryKey: ["getCases", computedFieldIdentifier],
        queryFn: () => {
            if (!computedFieldIdentifier) {
                return Promise.resolve<CaseInfo[]>([]);
            }
            return apiService.explore.getCases(computedFieldIdentifier);
        },
        enabled: fieldsQuery.isSuccess,
    });

    const computedCaseUuid = fixupCaseUuid(selectedCaseId, casesQuery.data);

    const ensemblesQuery = useQuery({
        queryKey: ["getEnsembles", computedCaseUuid],
        queryFn: () => {
            if (!computedCaseUuid) {
                return Promise.resolve<EnsembleInfo[]>([]);
            }
            return apiService.explore.getEnsembles(computedCaseUuid);
        },
        enabled: casesQuery.isSuccess,
    });

    const computedEnsembleName = fixupEnsembleName(selectedEnsembleName, ensemblesQuery.data);

    function handleFieldChanged(fieldIdentifier: string) {
        setSelectedField(fieldIdentifier);
    }

    function handleCaseChanged(caseUuids: string[]) {
        setSelectedCaseId(caseUuids[0]);
    }

    function handleEnsembleChanged(ensembleNames: string[]) {
        setSelectedEnsembleName(ensembleNames[0]);
    }

    function handleAddEnsemble() {
        if (computedCaseUuid && computedEnsembleName) {
            const caseName = casesQuery.data?.find((c) => c.uuid === computedCaseUuid)?.name ?? "UNKNOWN";
            const ensArr = [{ caseUuid: computedCaseUuid, caseName: caseName, ensembleName: computedEnsembleName }];
            if (
                selectedEnsembles.some(
                    (e) => e.caseUuid === computedCaseUuid && e.ensembleName === computedEnsembleName
                )
            ) {
                return;
            }
            setSelectedEnsembles((prev) => [...prev, ...ensArr]);
        }
    }

    // Is this the best way to get hold of the QueryClient
    // Revisit this when we refactor the ensemble selection dialog
    const queryClient = useQueryClient();

    React.useEffect(
        // We should not be pushing the ensemble selection out to the workbench continuously,
        // but rather wait until the OK button (in the containing dialog) is pushed.
        function loadEnsembleSetViaWorkbench() {
            props.workbench.loadAndSetupEnsembleSetInSession(queryClient, selectedEnsembles);
        },
        [selectedEnsembles]
    );

    function handleRemoveEnsemble(caseUuid: string, ensembleName: string) {
        setSelectedEnsembles((prev) => [
            ...prev.filter((e) => e.caseUuid !== caseUuid || e.ensembleName !== ensembleName),
        ]);
    }

    const fieldOpts = fieldsQuery.data?.map((f) => ({ value: f.field_identifier, label: f.field_identifier })) ?? [];
    const caseOpts = casesQuery.data?.map((c) => ({ value: c.uuid, label: c.name })) ?? [];
    const ensembleOpts = ensemblesQuery.data?.map((e) => ({ value: e.name, label: `${e.name}  (${e.realization_count} reals)` })) ?? [];

    return (
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
                            value={computedFieldIdentifier}
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
                            value={[computedCaseUuid]}
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
                            value={[computedEnsembleName]}
                            onChange={handleEnsembleChanged}
                            disabled={caseOpts.length === 0}
                            size={5}
                            width="100%"
                        />
                    </ApiStateWrapper>
                </Label>
                <div className="flex justify-end">
                    <Button variant="contained" onClick={handleAddEnsemble} className="bg-green-800 hover:bg-green-700">
                        Add
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
                            {selectedEnsembles.map((item) => (
                                <tr key={`${item.caseName}-${item.ensembleName}`} className="hover:bg-slate-100">
                                    <td className="p-2">
                                        <div className="text-ellipsis overflow-hidden whitespace-nowrap">
                                            {item.caseName}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <div className="text-ellipsis overflow-hidden whitespace-nowrap">
                                            {item.ensembleName}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <IconButton
                                            onClick={() => handleRemoveEnsemble(item.caseUuid, item.ensembleName)}
                                        >
                                            <TrashIcon width={20} />
                                        </IconButton>{" "}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Label>
                {selectedEnsembles.length === 0 && <div className="text-gray-500">No ensembles selected.</div>}
            </div>
        </div>
    );
};

function fixupFieldIdentifier(currFieldIdentifier: string, fieldArr: FieldInfo[] | undefined): string {
    const fieldIdentifiers = fieldArr ? fieldArr.map((item) => item.field_identifier) : [];
    if (currFieldIdentifier && fieldIdentifiers.includes(currFieldIdentifier)) {
        return currFieldIdentifier;
    }

    if (fieldIdentifiers.length > 0) {
        return fieldIdentifiers[0];
    }

    return "";
}

function fixupCaseUuid(currCaseUuid: string, caseArr: CaseInfo[] | undefined): string {
    const caseIds = caseArr ? caseArr.map((item) => item.uuid) : [];
    if (currCaseUuid && caseIds.includes(currCaseUuid)) {
        return currCaseUuid;
    }

    if (caseIds.length > 0) {
        return caseIds[0];
    }

    return "";
}

function fixupEnsembleName(currEnsembleName: string, ensembleArr: EnsembleInfo[] | undefined): string {
    const ensembleNames = ensembleArr ? ensembleArr.map((item) => item.name) : [];
    if (currEnsembleName && ensembleNames.includes(currEnsembleName)) {
        return currEnsembleName;
    }

    if (ensembleNames.length > 0) {
        return ensembleNames[0];
    }

    return "";
}
