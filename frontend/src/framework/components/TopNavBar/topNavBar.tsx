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

    const cases = useQuery([], async (): Promise<string[]> => {
        return apiService.timeseries.getCaseIds();
    });

    const handleFieldChange = (fieldName: string) => {
        props.workbench.setNavigatorFieldName(fieldName);
    };

    const handleCaseChange = (caseId: string) => {
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
                {cases.isLoading ? (
                    "Loading"
                ) : (
                    <ListBox
                        items={cases.isSuccess ? cases.data?.map((id) => ({ value: id, label: id })) || [] : []}
                        selectedItem={cases.data?.at(0) || "None"}
                        onSelect={handleCaseChange}
                    />
                )}
            </div>
        </div>
    );
};
