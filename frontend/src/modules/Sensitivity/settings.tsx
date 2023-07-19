import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@framework/components/ChannelSelect";
import { Label } from "@lib/components/Label";

import { State } from "./state";

export function settings({ moduleContext, workbenchServices }: ModuleFCProps<State>) {
    return (
        <>
            <Label text="Data channel response" key="data-channel-response">
                <ChannelSelect
                    moduleContext={moduleContext}
                    channelName="response"
                    broadcaster={workbenchServices.getBroadcaster()}
                />
            </Label>
            ,
        </>
    );
}
