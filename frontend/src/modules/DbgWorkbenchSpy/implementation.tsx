import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { AllTopicDefinitions, WorkbenchServices } from "@framework/WorkbenchServices";
import { Button } from "@lib/components/Button";

export type SharedState = {
    refreshCounter: number;
};

//-----------------------------------------------------------------------------------------------------------
export function WorkbenchSpySettings({ moduleContext, workbenchServices }: ModuleFCProps<SharedState>) {
    const setRefreshCounter = moduleContext.useSetStoreValue("refreshCounter");
    return (
        <div>
            <Button onClick={() => setRefreshCounter((prev: number) => prev + 1)}>Trigger Refresh</Button>
        </div>
    );
}

//-----------------------------------------------------------------------------------------------------------
export function WorkbenchSpyView({ moduleContext, workbenchServices }: ModuleFCProps<SharedState>) {
    const [fieldName, fieldName_TS] = useSubscribedValueWithUpdatedTS("navigator.fieldName", workbenchServices);
    const [caseUuid, caseUuid_TS] = useSubscribedValueWithUpdatedTS("navigator.caseId", workbenchServices);
    const [hoverRealization, hoverRealization_TS] = useSubscribedValueWithUpdatedTS(
        "global.hoverRealization",
        workbenchServices
    );
    const [hoverTimestamp, hoverTimestamp_TS] = useSubscribedValueWithUpdatedTS(
        "global.hoverTimestamp",
        workbenchServices
    );
    const refreshCounter = moduleContext.useStoreValue("refreshCounter");

    // prettier-ignore
    return (
        <code>
            Navigator topics:
            <table>
                <tr>  <td>fieldName</td>  <td><b>{fieldName || "N/A"}</b></td>  <td>({fieldName_TS})</td>  </tr>
                <tr>  <td>caseUuid</td>   <td><b>{caseUuid || "N/A"}</b></td>   <td>({caseUuid_TS})</td>  </tr>
            </table>

            <br/>
            Global topics:
            <table>
                <tr>  <td>hoverRealization</td>  <td><b>{hoverRealization?.realization || "N/A"}</b></td>  <td>({hoverRealization_TS})</td>  </tr>
                <tr>  <td>hoverTimestamp</td>    <td><b>{hoverTimestamp?.timestamp || "N/A"}</b></td>      <td>({hoverTimestamp_TS})</td>  </tr>
            </table>
            <br/>
            refreshCounter: {refreshCounter}
        </code>
    );
}

export function useSubscribedValueWithUpdatedTS<T extends keyof AllTopicDefinitions>(
    topic: T,
    workbenchServices: WorkbenchServices
): [data: AllTopicDefinitions[T] | null, updatedTS: string] {
    const [latestValue, setLatestValue] = React.useState<AllTopicDefinitions[T] | null>(null);
    const [lastUpdatedTS, setLastUpdatedTS] = React.useState("");

    React.useEffect(
        function subscribeToServiceTopic() {
            function handleNewValue(newValue: AllTopicDefinitions[T]) {
                setLatestValue(newValue);
                setLastUpdatedTS(
                    new Date().toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        fractionalSecondDigits: 2,
                    })
                );
            }
            const unsubscribeFunc = workbenchServices.subscribe(topic, handleNewValue);
            return unsubscribeFunc;
        },
        [topic, workbenchServices]
    );

    return [latestValue, lastUpdatedTS];
}
