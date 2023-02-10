import React from "react";
import { useQuery } from "react-query";

import { apiService } from "@framework/ApiService";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");
    const fieldName = useSubscribedValue("navigator.fieldName", props.workbenchServices);
    const caseId = useSubscribedValue("navigator.caseId", props.workbenchServices);

    const ensemblesQueryRes = useQuery({
        queryKey: ["getEnsembles", caseId],
        queryFn: () => apiService.explore.getEnsembles(caseId || ""),
        enabled: caseId ? true : false,
    });

    return (
        <div>
            <h2>FieldName: {fieldName || "N/A"}</h2>
            <h2>CaseId: {caseId || "N/A"}</h2>
            <h3>Count: {count}</h3>
            <br />
            <h4>Ensembles:</h4>
            <ul> 
                {ensemblesQueryRes.data?.map((ens) => (<li key={ens.name}>{ens.name}</li>))} 
            </ul>
        </div>
    );
};
