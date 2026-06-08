import React from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { getCalcSomethingOnDerivedTableOptions } from "@api/@tanstack/react-query.gen";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";

import type { Interfaces } from "./interfaces";


export function DbgLroTestingView(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const displayableData = props.viewContext.useSettingsToViewInterfaceValue("displayableData");
    const viewInputData = props.viewContext.useSettingsToViewInterfaceValue("viewInputData");

    const statusWriter = useViewStatusWriter(props.viewContext);
    statusWriter.setLoading(displayableData ? displayableData.settingsIsLoading : false);

    const theText = displayableData ? displayableData.infoString : "N/A";

    const caseUuid = viewInputData?.ensembleIdent ? viewInputData.ensembleIdent.getCaseUuid() : null;
    const ensembleName = viewInputData?.ensembleIdent ? viewInputData.ensembleIdent.getEnsembleName() : null;
    const derivedTableHandle = viewInputData?.derivedTableHandle ?? null;
    const calculationParams = viewInputData?.calculationParams ?? null;

    //console.log(`DbgLroTestingView: caseUuid=${caseUuid}, ensembleName=${ensembleName}, derivedTableHandle=${derivedTableHandle}, calculationParams=${calculationParams}`);
    const calcQuery = useQuery({
        ...getCalcSomethingOnDerivedTableOptions({
            query: {
                case_uuid: caseUuid ?? "DUMMY",
                ensemble_name: ensembleName ?? "DUMMY",
                derived_table_handle: derivedTableHandle ?? "DUMMY",
                calculation_params: calculationParams ?? "DUMMY",
            },
        }),
        enabled: Boolean(caseUuid && ensembleName && derivedTableHandle && calculationParams),
    });

    calcQuery.isLoading && statusWriter.setLoading(true);

    // if (calcQuery.isError) {
    //     console.log("Calc query error:", calcQuery.error);
    // }

    let statusStr = "DISABLED";
    if (calcQuery.isEnabled) {
        statusStr = calcQuery.status;

        if (calcQuery.error && isAxiosError(calcQuery.error)) {
            statusStr += ` (${calcQuery.error.response?.status})`;
        }
    }

    return (
        <div className="relative w-full h-full flex flex-col">
            My text:
            <br />
            {theText.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                    {i > 0 ? <br /> : null}
                    {line}
                </React.Fragment>
            ))}
            
            <br />
            <br />
            Settings progress:
            <br />
            {displayableData?.settingsProgressText ?? "N/A"}
            
            <br />
            <br />
            View inputs:
            <table>
                <tbody>
                    {makeTableRow("caseUuid", caseUuid ?? "N/A")}
                    {makeTableRow("ensembleName", ensembleName ?? "N/A")}
                    {makeTableRow("derivedTableHandle", derivedTableHandle ?? "N/A")}
                    {makeTableRow("calculationParams", calculationParams ?? "N/A")}
                </tbody>
            </table>
            
            <br />
            <br />
            Calc query:
            <br />
            Status: {statusStr}
            <br />
            Data: {calcQuery.data ? JSON.stringify(calcQuery.data) : "N/A"}
        </div>
    );
}

function makeTableRow(label: string, value: any) {
    return (
        <tr>
            <td>{label}</td>
            <td>
                <b>{value || "N/A"}</b>
            </td>
        </tr>
    );
}
