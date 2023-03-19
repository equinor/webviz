import React from "react";

import { EnsembleParameterDescription } from "@api";
import { apiService } from "@framework/ApiService";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { Checkbox } from "@lib/components/Checkbox";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { useParameterNamesQuery } from "./queryHooks";
import { sortBy, sortedUniq } from "lodash";

import { State } from "./registerModule";

import { DropdownProps } from "../../lib/components/Dropdown/dropdown";
import { Select } from "@lib/components/Select";

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    console.log("render Settings");

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const [ensembleName, setEnsembleName] = moduleContext.useStoreState("ensembleName");
    const [parameterName, setParameterName] = moduleContext.useStoreState("parameterName");

    const ensemblesQuery = useQuery({
        queryKey: ["getEnsembles", caseUuid],
        queryFn: () => apiService.explore.getEnsembles(caseUuid || ""),
        enabled: caseUuid ? true : false,
        onSuccess: function selectDefaultEnsemble(ensembleArr) {
            if (ensembleArr.length > 0) {
                setEnsembleName(ensembleArr[0].name);
            }
        },
    });

    const parameterNamesQuery = useParameterNamesQuery(caseUuid, ensembleName, true);

    function makeParameterListItems(parameterNamesQuery: UseQueryResult<EnsembleParameterDescription[]>): DropdownProps["options"] {
        const itemArr: DropdownProps["options"] = [];
        if (parameterNamesQuery.isSuccess && parameterNamesQuery.data.length > 0) {
            for (const param of parameterNamesQuery.data) {
                itemArr.push({ value: param.name, label: param.descriptive_name ?? param.name });
            }
        } else {
            // itemArr.push({ value: "", label: `${vectorsQuery.status.toString()}...`, disabled: true });
        }
        return itemArr;
    }

    function handleParameterNameChange(parameterName: string[]) {

        setParameterName(parameterName[0]);
    }
    const pname: string = parameterName ?? "";
    return (
        <>
            <Label text="Parameter">
                <Select
                    options={makeParameterListItems(parameterNamesQuery)}
                    value={[pname]}
                    onChange={handleParameterNameChange}
                    multiple={false}
                    size={40}
                />
            </Label>

        </>
    );
}
