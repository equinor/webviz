import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { AllTopicDefinitions, WorkbenchServices } from "@framework/WorkbenchServices";
import { Button } from "@lib/components/Button";

export type SharedState = {
    triggeredRefreshCounter: number;
};

//-----------------------------------------------------------------------------------------------------------
export function WorkbenchSpySettings(props: ModuleFCProps<SharedState>) {
    const setRefreshCounter = props.moduleContext.useSetStoreValue("triggeredRefreshCounter");
    return (
        <div>
            <Button onClick={() => setRefreshCounter((prev: number) => prev + 1)}>Trigger Refresh</Button>
        </div>
    );
}

//-----------------------------------------------------------------------------------------------------------
export function WorkbenchSpyView(props: ModuleFCProps<SharedState>) {
    const [selectedEnsembles, selectedEnsembles_TS] = useServiceValueWithTS("navigator.ensembles", props.workbenchServices);
    const [hoverRealization, hoverRealization_TS] = useServiceValueWithTS("global.hoverRealization", props.workbenchServices);
    const [hoverTimestamp, hoverTimestamp_TS] = useServiceValueWithTS("global.hoverTimestamp", props.workbenchServices);
    const triggeredRefreshCounter = props.moduleContext.useStoreValue("triggeredRefreshCounter");

    const componentRenderCount = React.useRef(0);
    React.useEffect(function incrementComponentRenderCount() {
        componentRenderCount.current = componentRenderCount.current + 1;
    });

    const componentLastRenderTS = getTimestampString();

    let ensembleSpecAsString: string | undefined;
    if (selectedEnsembles) {
        if (selectedEnsembles.length > 0) {
            ensembleSpecAsString = `${selectedEnsembles[0].ensembleName}  (${selectedEnsembles[0].caseUuid})`;
        } else {
            ensembleSpecAsString = "empty array";
        }
    }

    return (
        <code>
            Navigator topics:
            <table>
                <tbody>{makeTableRow("ensembles", ensembleSpecAsString, selectedEnsembles_TS)}</tbody>
            </table>
            <br />
            Global topics:
            <table>
                <tbody>
                    {makeTableRow("hoverRealization", hoverRealization?.realization, hoverRealization_TS)}
                    {makeTableRow("hoverTimestamp", hoverTimestamp?.timestamp, hoverTimestamp_TS)}
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

function makeTableRow(label: string, value: any, ts: string) {
    return (
        <tr>
            <td>{label}</td>
            <td>
                <b>{value || "N/A"}</b>
            </td>
            <td>({ts})</td>
        </tr>
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

function useServiceValueWithTS<T extends keyof AllTopicDefinitions>(
    topic: T,
    workbenchServices: WorkbenchServices
): [data: AllTopicDefinitions[T] | null, updatedTS: string] {
    const [latestValue, setLatestValue] = React.useState<AllTopicDefinitions[T] | null>(null);
    const [lastUpdatedTS, setLastUpdatedTS] = React.useState("");

    React.useEffect(
        function subscribeToServiceTopic() {
            function handleNewValue(newValue: AllTopicDefinitions[T]) {
                setLatestValue(newValue);
                setLastUpdatedTS(getTimestampString());
            }
            const unsubscribeFunc = workbenchServices.subscribe(topic, handleNewValue);
            return unsubscribeFunc;
        },
        [topic, workbenchServices]
    );

    return [latestValue, lastUpdatedTS];
}
