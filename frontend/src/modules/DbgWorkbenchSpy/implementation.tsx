import React from "react";

import { atom, useSetAtom } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { HoverData, HoverService } from "@framework/HoverService";
import { HoverTopic, useHoverValue } from "@framework/HoverService";
import type { ModuleViewProps } from "@framework/Module";
import { timestampUtcMsToIsoString } from "@framework/utils/timestampUtils";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Button } from "@lib/components/Button";

import type { Interfaces } from "./interfaces";

export const triggeredRefreshCounterAtom = atom<number>(0);

//-----------------------------------------------------------------------------------------------------------
export function WorkbenchSpySettings() {
    const setRefreshCounter = useSetAtom(triggeredRefreshCounterAtom);
    return (
        <div>
            <Button onClick={() => setRefreshCounter((prev: number) => prev + 1)}>Trigger Refresh</Button>
        </div>
    );
}

//-----------------------------------------------------------------------------------------------------------
export function WorkbenchSpyView(props: ModuleViewProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const moduleInstanceId = props.viewContext.getInstanceIdString();
    const [hoverRealization, hoverRealization_TS] = useHoverValueWithTS(
        HoverTopic.REALIZATION,
        props.hoverService,
        moduleInstanceId,
    );
    const [hoverTimestamp, hoverTimestamp_TS] = useHoverValueWithTS(
        HoverTopic.TIMESTAMP,
        props.hoverService,
        moduleInstanceId,
    );
    const triggeredRefreshCounter = props.viewContext.useSettingsToViewInterfaceValue("triggeredRefreshCounter");

    const componentRenderCount = React.useRef(0);
    React.useEffect(function incrementComponentRenderCount() {
        componentRenderCount.current = componentRenderCount.current + 1;
    });

    const componentLastRenderTS = getTimestampString();

    return (
        <code>
            EnsembleSet:
            {makeEnsembleSetTable(ensembleSet)}
            <br />
            Global topics:
            <table>
                <tbody>
                    {makeTableRow("hoverRealization", hoverRealization, hoverRealization_TS)}
                    {makeTableRow("hoverTimestamp", hoverTimestamp, hoverTimestamp_TS)}
                    {makeTableRow(
                        "hoverTimestamp isoStr",
                        hoverTimestamp != null ? timestampUtcMsToIsoString(hoverTimestamp) : "UNDEF",
                    )}
                </tbody>
            </table>
            <br />
            <br />
            refreshCounter: {triggeredRefreshCounter}
            <br />
            componentRenderCount: {componentRenderCount.current}
            <br />
            componentLastRenderTS: {componentLastRenderTS}
        </code>
    );
}

function makeTableRow(label: string, value: any, updatedTS?: string) {
    return (
        <tr>
            <td>{label}</td>
            <td>
                <b>{value || "N/A"}</b>
            </td>
            <td>{updatedTS ? `(${updatedTS})` : null}</td>
        </tr>
    );
}

function makeEnsembleSetTable(ensembleSet: EnsembleSet) {
    const ensembleArr = ensembleSet.getRegularEnsembleArray();
    return (
        <table>
            <tbody>
                {ensembleArr.map((ens, index) => (
                    <tr key={index}>
                        <td> {ens.getEnsembleName()} </td>
                        <td> ({ens.getCaseUuid()}) </td>
                        <td> {ens.getRealizations().length} realizations</td>
                        <td> {ens.getSensitivities() ? "HasSens" : "noSense"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function getTimestampString() {
    return new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 2,
    });
}

function useHoverValueWithTS<T extends keyof HoverData>(
    topic: T,
    hoverService: HoverService,
    moduleInstanceId: string,
): [data: HoverData[T] | null, updatedTS: string] {
    const latestValue = useHoverValue(topic, hoverService, moduleInstanceId);
    const [lastUpdatedTS, setLastUpdatedTS] = React.useState("");

    React.useEffect(
        function stampUpdateTime() {
            setLastUpdatedTS(getTimestampString());
        },
        [latestValue],
    );

    return [latestValue, lastUpdatedTS];
}
