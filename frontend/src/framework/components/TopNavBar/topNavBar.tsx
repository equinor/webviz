import React from "react";
import { useQuery } from "@tanstack/react-query";

import { apiService } from "@framework/ApiService";
import { useStoreState } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { ToggleButton } from "@lib/components/ToggleButton";

import { LoginButton } from "../LoginButton";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [selectedCaseId, setSelectedCaseId] = React.useState("");
    const [modulesListOpen, setModulesListOpen] = useStoreState(props.workbench.getStateStore(), "modulesListOpen");

    const casesQueryRes = useQuery({
        queryKey: ["getCases"],
        queryFn: () => apiService.explore.getCases("DROGON"),
        onSuccess: function selectFirstCase(caseArr) {
            if (caseArr.length > 0) {
                setSelectedCaseId(caseArr[0].uuid);
                props.workbench.setNavigatorCaseId(caseArr[0].uuid);
            }
        },
    });

    const handleFieldChange = (fieldName: string | number) => {
        props.workbench.setNavigatorFieldName(fieldName as string);
    };

    const handleCaseChange = (caseId: string | number) => {
        setSelectedCaseId(caseId as string);
        props.workbench.setNavigatorCaseId(caseId as string);
    };

    const handleToggleModulesList = (value: boolean) => {
        setModulesListOpen(value);
    };

    const fields = [
        {
            value: "Drogon",
            label: "Drogon",
        },
    ];

    return (
        <div className="bg-slate-100 p-4">
            <div className="flex flex-row gap-4 items-center">
                <h1 className="flex-grow">{activeModuleName}</h1>
                <Dropdown options={fields} value={"Drogon"} onChange={handleFieldChange} />
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
                        value={selectedCaseId || "None"}
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
