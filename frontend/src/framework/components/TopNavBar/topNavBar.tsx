import React from "react";
import { useQuery } from "react-query";

import { apiService } from "@framework/ApiService";
import { Workbench } from "@framework/Workbench";
// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { ListBox } from "@lib/components/ListBox";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [selectedCaseId, setSelectedCaseId] = React.useState("")

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

    const handleFieldChange = (fieldName: string) => {
        props.workbench.setNavigatorFieldName(fieldName);
    };

    const handleCaseChange = (caseId: string) => {
        setSelectedCaseId(caseId);
        props.workbench.setNavigatorCaseId(caseId);
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
                <ListBox items={fields} selectedItem={"Drogon"} onSelect={handleFieldChange} />
                {casesQueryRes.isLoading ? (
                    "Loading"
                ) : (
                    <ListBox
                        items={casesQueryRes.isSuccess ? casesQueryRes.data?.map((aCase) => ({ value: aCase.uuid, label: aCase.name })) || [] : []}
                        selectedItem={selectedCaseId || "None"}
                        onSelect={handleCaseChange}
                    />
                )}
            </div>
        </div>
    );
};
