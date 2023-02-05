import React from "react";

// import { useWorkbenchActiveModuleName } from "@/core/hooks/useWorkbenchActiveModuleName";
import { ListBox } from "@/lib/components/ListBox";
import { Workbench } from "@/core/framework/Workbench";

type TopNavBarProps = {
    workbench: Workbench;
}

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();

    const handleFieldChange = (fieldName: string) => {
        props.workbench.setNavigatorFieldName(fieldName);
    };

    const handleCaseChange = (caseId: string) => {
        props.workbench.setNavigatorCaseId(caseId);
    };

    const fields = [
        {
            value: "field1",
            label: "Field 1",
        },
        {
            value: "field2",
            label: "Field 2",
        },
    ];

    const cases = [
        {
            value: "case1",
            label: "Case 1",
        },
        {
            value: "case2",
            label: "Case 2",
        },
    ];

    return (
        <div className="bg-slate-100 p-4">
            <div className="flex flex-row gap-4 items-center">
                <h1 className="flex-grow">{activeModuleName}</h1>
                <ListBox
                    items={fields}
                    selectedItem={"None"}
                    onSelect={handleFieldChange}
                />
                <ListBox
                    items={cases}
                    selectedItem={"None"}
                    onSelect={handleCaseChange}
                />
            </div>
        </div>
    );
};
