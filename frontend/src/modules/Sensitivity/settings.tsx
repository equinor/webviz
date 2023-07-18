import { ModuleFCProps } from "@framework/Module";
import { ChannelSelect } from "@framework/components/ChannelSelect";
import { Label } from "@lib/components/Label";

import { State } from "./state";

export function settings({ moduleContext, workbenchServices, initialSettings }: ModuleFCProps<State>) {
    return (
        <>
            <Label text="Data channel X axis" key="data-channel-x-axis">
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
