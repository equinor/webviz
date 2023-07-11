import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@framework/components/ChannelSelect";
import { Label } from "@lib/components/Label";

import { State } from "./state";

export function settings({ moduleContext, workbenchServices, initialSettings }: ModuleFCProps<State>) {
    const [responseChannelName, setResponseChannelName] = moduleContext.useStoreState("responseChannelName");

    initialSettings?.applyToState("responseChannelName", "string", setResponseChannelName);

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
