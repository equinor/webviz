import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { useRealizationsResponses } from "./hooks/useRealizationResponses";
import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const responseNames = props.moduleContext.useStoreValue("selectedResponseNames");
    const tableNames = props.moduleContext.useStoreValue("selectedTableNames");
    const ensembleIdents = props.moduleContext.useStoreValue("selectedEnsembleIdents");
    const ref = React.useRef<HTMLDivElement>(null);
    const size = useElementSize(ref);

    const tableData = useRealizationsResponses(ensembleIdents, tableNames, responseNames);

    return (
        <div ref={ref} className="w-full h-full">
            {JSON.stringify(ensembleIdents)}
            {JSON.stringify(responseNames)}
            {JSON.stringify(tableNames)}
            {JSON.stringify(tableData)}
        </div>
    );
};
