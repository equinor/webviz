import React from "react";

import { apiService } from "@framework/ApiService";
import { useStoreState } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { ToggleButton } from "@lib/components/ToggleButton";
import { useQuery } from "@tanstack/react-query";

import { LoginButton } from "../LoginButton";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [selectedField, setSelectedField] = React.useState<string>("");
    const [selectedCaseId, setSelectedCaseId] = React.useState<string>("");
    const [modulesListOpen, setModulesListOpen] = useStoreState(props.workbench.getStateStore(), "modulesListOpen");

    const casesQueryRes = useQuery({
        queryKey: ["getCases", selectedField],
        queryFn: () => apiService.explore.getCases(selectedField),
        onSuccess: function selectFirstCase(caseArr) {
            if (caseArr.length > 0) {
                setSelectedCaseId(caseArr[0].uuid);
                props.workbench.setNavigatorCaseId(caseArr[0].uuid);
            }
        },
    });

    const handleFieldChange = (fieldName: string) => {
        setSelectedField(fieldName);
        props.workbench.setNavigatorFieldName(fieldName);
    };

    const handleCaseChange = (caseId: string) => {
        setSelectedCaseId(caseId);
        props.workbench.setNavigatorCaseId(caseId);
    };

    const handleToggleModulesList = (value: boolean) => {
        setModulesListOpen(value);
    };

    const fields = [
        {
            value: "DROGON",
            label: "Drogon",
        },
    ];

    return (
        <div className="bg-slate-100 p-4">
            <div className="flex flex-row gap-4 items-center">
                <h1 className="flex-grow">{activeModuleName}</h1>
                <Dropdown options={fields} value={selectedField} onChange={handleFieldChange} />
                <ApiStateWrapper
                    apiResult={casesQueryRes}
                    errorComponent={<div className="text-red-500">Error loading cases</div>}
                    loadingComponent={<CircularProgress />}
                >
                    <Dropdown
                        options={
                            casesQueryRes.isSuccess
                                ? casesQueryRes.data?.map((aCase) => ({ value: aCase.uuid, label: aCase.name })) || []
                                : []
                        }
                        value={selectedCaseId}
                        onChange={handleCaseChange}
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
