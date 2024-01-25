import React from "react";

import { Workbench } from "@framework/Workbench";

import { RealizationFilter } from "../RealizationFilter";

type FilterBarProps = { workbench: Workbench };

export const FilterBar: React.FC<FilterBarProps> = (props) => {
    return (
        <div className="bg-white p-2 border-r-2 z-50 flex flex-col min-w-96 w-1/5">
            <RealizationFilter workbench={props.workbench} />
        </div>
    );
};
