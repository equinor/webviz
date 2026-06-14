import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";

import type { Interfaces } from "./interfaces";


export function DbgLroTestingView(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const displayableData = props.viewContext.useSettingsToViewInterfaceValue("displayableData");
    const viewInputData = props.viewContext.useSettingsToViewInterfaceValue("viewInputData");

    const statusWriter = useViewStatusWriter(props.viewContext);
    statusWriter.setLoading((displayableData?.isFetchingDerivedTableHandle || displayableData?.isFetchingInfo || displayableData?.isFetchingCalc) ?? false);

    const caseUuid = viewInputData?.ensembleIdent ? viewInputData.ensembleIdent.getCaseUuid() : null;
    const ensembleName = viewInputData?.ensembleIdent ? viewInputData.ensembleIdent.getEnsembleName() : null;
    const derivedTableHandle = viewInputData?.derivedTableHandle ?? null;
    const calculationParams = viewInputData?.calculationParams ?? null;

    const debugInfoStr = displayableData ? displayableData.debugInfoStr : "N/A";


    return (
        <div className="relative w-full h-full flex flex-col">
            <b>View inputs:</b>
            <table>
                <tbody>
                    {makeTableRow("caseUuid", caseUuid ?? "N/A")}
                    {makeTableRow("ensembleName", ensembleName ?? "N/A")}
                    {makeTableRow("derivedTableHandle", derivedTableHandle ?? "N/A")}
                    {makeTableRow("calculationParams", calculationParams ?? "N/A")}
                </tbody>
            </table>

            <br />
            <b>Table handle:</b>
            IsFetching: {displayableData?.isFetchingDerivedTableHandle ? "yes" : "no"}
            <br />
            Status: {displayableData?.hybridStatusStr ?? "--"}
            <br />
            Progress: {displayableData?.hybridProgressText ?? "--"}

            <br />
            <br />
            <b>Info query:</b>
            Status: {displayableData?.infoStatusStr ?? "--"}
            <br />
            Data: {displayableData?.infoDataStr ?? "--"}

            <br />
            <br />
            <b>Calc query:</b>
            Status: {displayableData?.calcStatusStr ?? "--"}
            <br />
            Data: {displayableData?.calcDataStr ?? "--"}

            <br />
            <br />
            <b>DebugInfoStr:</b>
            {debugInfoStr.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                    {i > 0 ? <br /> : null}
                    {line}
                </React.Fragment>
            ))}
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
