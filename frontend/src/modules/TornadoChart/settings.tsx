import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@framework/components/ChannelSelect";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { R } from "@tanstack/react-query-devtools/build/legacy/devtools-c71c5f06";

import { State } from "./state";

export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const sensitivityNames = moduleContext.useStoreValue("sensitivityNames");
    const [referenceSensitivityName, setReferenceSensitivityName] = React.useState<string | null>(null);
    const setModuleReferenceSensitivityName = moduleContext.useSetStoreValue("referenceSensitivityName");
    React.useEffect(
        function propogateReferenceSensitivityName() {
            setModuleReferenceSensitivityName(referenceSensitivityName);
        },
        [referenceSensitivityName]
    );

    if (!referenceSensitivityName && sensitivityNames.length > 0) {
        if (sensitivityNames.includes("rms_seed")) {
            setReferenceSensitivityName("rms_seed");
        } else {
            setReferenceSensitivityName(sensitivityNames[0]);
        }
    }

    return (
        <>
            <Label text="Data channel" key="data-channel-x-axis">
                <ChannelSelect
                    moduleContext={moduleContext}
                    channelName="response"
                    broadcaster={workbenchServices.getBroadcaster()}
                />
            </Label>
            <Label text="Reference sensitivity">
                <Dropdown
                    value={referenceSensitivityName ?? ""}
                    options={sensitivityNames.map((s) => ({ label: s, value: s }))}
                    onChange={setReferenceSensitivityName}
                />
            </Label>
            ,
        </>
    );
}
