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

    const data = useQuery([fieldName, caseId], async (): Promise<string[]> => {
        return apiService.timeseries.getCaseIds();
    });

    return (
        <div>
            <h2>FieldName: {fieldName || "N/A"}</h2>
            <h2>CaseId: {caseId || "N/A"}</h2>
            <h3>Count: {count}</h3>
            <h4>Case ids:</h4>
            <br />
            {data.data?.map((id) => (
                <div key={id}>{id}</div>
            ))}
        </div>
    );
};
