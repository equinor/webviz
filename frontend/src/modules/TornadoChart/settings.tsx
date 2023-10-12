import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { applyInitialSettingsToState } from "@framework/InitialSettings";
import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@framework/components/ChannelSelect";
import { Label } from "@lib/components/Label";

import { State } from "./state";

export function settings({ moduleContext, workbenchServices, initialSettings }: ModuleFCProps<State>) {
    const [responseChannelName, setResponseChannelName] = moduleContext.useStoreState("responseChannelName");

    applyInitialSettingsToState(initialSettings, "responseChannelName", "string", setResponseChannelName);

    function handleResponseChannelNameChange(channelName: string) {
        setResponseChannelName(channelName);
    }

    return (
        <>
            <Label text="Data channel" key="data-channel-x-axis">
                <ChannelSelect
                    onChange={handleResponseChannelNameChange}
                    channelKeyCategory={BroadcastChannelKeyCategory.Realization}
                    initialChannel={responseChannelName || undefined}
                    broadcaster={workbenchServices.getBroadcaster()}
                />
            </Label>
            ,
        </>
    );
}
