import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@framework/components/ChannelSelect";
import { Label } from "@lib/components/Label";

import { State } from "./state";

export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    return (
        <>
            <Label text="Data channel" key="data-channel-x-axis">
                <ChannelSelect
                    moduleContext={moduleContext}
                    channelName="responseChannel"
                    broadcaster={workbenchServices.getBroadcaster()}
                />
            </Label>
            ,
        </>
    );
}
