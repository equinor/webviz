import React from "react";

import { workbench } from "@/core/framework/workbench";
import { useWorkbenchActiveModuleName } from "@/core/hooks/useWorkbenchActiveModuleName";
import { ListBox } from "@/lib/components/ListBox";

const useWorkbenchState = workbench.getStateStore().useState();

export const TopNavBar: React.FC = () => {
    const [currentField, setCurrentField] = useWorkbenchState("field");
    const [currentCase, setCurrentCase] = useWorkbenchState("case");
    const activeModuleName = useWorkbenchActiveModuleName();

    const handleFieldChange = (field: string) => {
        setCurrentField(field);
    };

    const handleCaseChange = (caseName: string) => {
        setCurrentCase(caseName);
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
                    selectedItem={(currentField as string) || "None"}
                    onSelect={handleFieldChange}
                />
                <ListBox
                    items={cases}
                    selectedItem={(currentCase as string) || "None"}
                    onSelect={handleCaseChange}
                />
            </div>
        </div>
    );
};
