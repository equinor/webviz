import React from "react";

import { Case, Ensemble, Field } from "@api";
import { apiService } from "@framework/ApiService";
import { useStoreState } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { ToggleButton } from "@lib/components/ToggleButton";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { LoginButton } from "../LoginButton";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [selectedField, setSelectedField] = React.useState<string>("");
    const [selectedCaseId, setSelectedCaseId] = React.useState<string>("");
    const [selectedEnsembleName, setSelectedEnsembleName] = React.useState<string>("");
    const [modulesListOpen, setModulesListOpen] = useStoreState(props.workbench.getStateStore(), "modulesListOpen");

    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

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
                return Promise.resolve<Case[]>([]);
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
                return Promise.resolve<Ensemble[]>([]);
            }
            return apiService.explore.getEnsembles(computedCaseUuid);
        },
        enabled: casesQuery.isSuccess,
    });

    const computedEnsembleName = fixupEnsembleName(selectedEnsembleName, ensemblesQuery.data);

    console.log(
        `TopNavBar renderCount=${renderCount.current}` + makeQueriesDbgString(fieldsQuery, casesQuery, ensemblesQuery)
    );

    if (computedFieldIdentifier && computedFieldIdentifier !== selectedField) {
        setSelectedField(computedFieldIdentifier);
    }
    if (computedCaseUuid && computedCaseUuid !== selectedCaseId) {
        setSelectedCaseId(computedCaseUuid);
    }
    if (computedEnsembleName && computedEnsembleName !== selectedEnsembleName) {
        setSelectedEnsembleName(computedEnsembleName);
    }

    React.useEffect(
        function publishSelectionViaWorkbench() {
            props.workbench.setNavigatorFieldName(computedFieldIdentifier);
            props.workbench.setNavigatorCaseId(computedCaseUuid);
            if (computedCaseUuid && computedEnsembleName) {
                const caseName = casesQuery.data?.find((c) => c.uuid === computedCaseUuid)?.name ?? "UNKNOWN";
                const ensArr = [{ caseUuid: computedCaseUuid, caseName: caseName, ensembleName: computedEnsembleName }];
                props.workbench.setNavigatorEnsembles(ensArr);
            } else {
                props.workbench.setNavigatorEnsembles([]);
            }
        },
        [computedFieldIdentifier, computedCaseUuid, computedEnsembleName]
    );

    function handleFieldChanged(fieldIdentifier: string) {
        setSelectedField(fieldIdentifier);
    }

    function handleCaseChanged(caseUuid: string) {
        setSelectedCaseId(caseUuid);
    }

    function handleEnsembleChanged(ensembleName: string) {
        setSelectedEnsembleName(ensembleName);
    }

    const handleToggleModulesList = (value: boolean) => {
        setModulesListOpen(value);
    };

    const fieldOpts = fieldsQuery.data?.map((f) => ({ value: f.field_identifier, label: f.field_identifier })) ?? [];
    const caseOpts = casesQuery.data?.map((c) => ({ value: c.uuid, label: c.name })) ?? [];
    const ensembleOpts = ensemblesQuery.data?.map((e) => ({ value: e.name, label: e.name })) ?? [];

    return (
        <div className="bg-slate-100 p-4">
            <div className="flex flex-row gap-4 items-center">
                <h1 className="flex-grow">{activeModuleName}</h1>
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
                <ApiStateWrapper
                    apiResult={casesQuery}
                    errorComponent={<div className="text-red-500">Error loading cases</div>}
                    loadingComponent={<CircularProgress />}
                >
                    <Dropdown
                        options={caseOpts}
                        value={computedCaseUuid}
                        onChange={handleCaseChanged}
                        disabled={caseOpts.length === 0}
                    />
                </ApiStateWrapper>
                <ApiStateWrapper
                    apiResult={ensemblesQuery}
                    errorComponent={<div className="text-red-500">Error loading ensembles</div>}
                    loadingComponent={<CircularProgress />}
                >
                    <Dropdown
                        options={ensembleOpts}
                        value={computedEnsembleName}
                        onChange={handleEnsembleChanged}
                        disabled={ensembleOpts.length === 0}
                    />
                </ApiStateWrapper>
                <ToggleButton active={modulesListOpen} onToggle={(active: boolean) => handleToggleModulesList(active)}>
                    Add modules
                </ToggleButton>
                <LoginButton />
            </div>
        </div>
    );
};

function fixupFieldIdentifier(currFieldIdentifier: string, fieldArr: Field[] | undefined): string {
    const fieldIdentifiers = fieldArr ? fieldArr.map((item) => item.field_identifier) : [];
    if (currFieldIdentifier && fieldIdentifiers.includes(currFieldIdentifier)) {
        return currFieldIdentifier;
    }

    if (fieldIdentifiers.length > 0) {
        return fieldIdentifiers[0];
    }

    return "";
}

function fixupCaseUuid(currCaseUuid: string, caseArr: Case[] | undefined): string {
    const caseIds = caseArr ? caseArr.map((item) => item.uuid) : [];
    if (currCaseUuid && caseIds.includes(currCaseUuid)) {
        return currCaseUuid;
    }

    if (caseIds.length > 0) {
        return caseIds[0];
    }

    return "";
}

function fixupEnsembleName(currEnsembleName: string, ensembleArr: Ensemble[] | undefined): string {
    const ensembleNames = ensembleArr ? ensembleArr.map((item) => item.name) : [];
    if (currEnsembleName && ensembleNames.includes(currEnsembleName)) {
        return currEnsembleName;
    }

    if (ensembleNames.length > 0) {
        return ensembleNames[0];
    }

    return "";
}

function makeQueriesDbgString(fields: UseQueryResult, cases: UseQueryResult, ens: UseQueryResult): string {
    let s = "";
    s += `  fields: ${fields.status.slice(0, 4)}/${fields.fetchStatus.slice(0, 4)} - data=${fields.data ? "Y" : "N"}`;
    s += `  cases: ${cases.status.slice(0, 4)}/${cases.fetchStatus.slice(0, 4)} - data=${cases.data ? "Y" : "N"}`;
    s += `  ensembles: ${ens.status.slice(0, 4)}/${ens.fetchStatus.slice(0, 4)} - data=${ens.data ? "Y" : "N"}`;
    return s;
}
