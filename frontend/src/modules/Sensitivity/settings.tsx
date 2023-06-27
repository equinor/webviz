import React from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@framework/components/ChannelSelect";
import { Label } from "@lib/components/Label";

import { State } from "./state";

export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    const [responseChannelName, setResponseChannelName] = moduleContext.useStoreState("responseChannelName");

    React.useEffect(() => {
        const presetProps = {
            responseChannelName: moduleContext.getPresetProp<string>("responseChannelName", "string"),
        };
        if (presetProps.responseChannelName) {
            setResponseChannelName(presetProps.responseChannelName as string);
        }
    }, [moduleContext]);

    if (moduleContext.propPresetAs("responseChannelName", "string")) {
        return null;
    }

    return (
        <>
            <Label text="Data channel X axis" key="data-channel-x-axis">
                <ChannelSelect
                    onChange={setResponseChannelName}
                    channelKeyCategory={BroadcastChannelKeyCategory.Realization}
                    initialChannel={responseChannelName || undefined}
                    broadcaster={workbenchServices.getBroadcaster()}
                />
            </Label>
            ,
        </>
    );
}
