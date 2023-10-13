import React from "react";

import { BroadcastChannel, Broadcaster } from "@framework/Broadcaster";
import { ModuleContext } from "@framework/ModuleContext";
import { BaseComponentProps } from "@lib/components/BaseComponent";
import { Dropdown } from "@lib/components/Dropdown";

export type ChannelSelectProps = {
    moduleContext: ModuleContext<any>;
    channelName: string;
    className?: string;
    broadcaster: Broadcaster;
} & BaseComponentProps;

export const ChannelSelect: React.FC<ChannelSelectProps> = (props) => {
    const { moduleContext, broadcaster, ...rest } = props;

    const channel = moduleContext.useInputChannel(props.channelName);
    const [channels, setChannels] = React.useState<string[]>([]);

    if (prevInitialChannel !== props.initialChannel) {
        setPrevInitialChannel(props.initialChannel);
        setChannel(props.initialChannel ?? "");
    }

    React.useEffect(() => {
        const handleChannelsChanged = (channels: BroadcastChannel[]) => {
            const inputChannel = moduleContext.getInputChannel(props.channelName);

            const acceptedKeys = moduleContext.getInputChannelDef(props.channelName)?.keyCategories;

            const validChannels = Object.values(channels).filter((channel) => {
                if (!acceptedKeys || acceptedKeys.some((key) => channel.getDataDef().key === key)) {
                    if (!inputChannel || inputChannel.getDataDef().key === channel.getDataDef().key) {
                        return true;
                    }
                    return false;
                }
            });
            setChannels(validChannels.map((el) => el.getName()));
        };

        const unsubscribeFunc = broadcaster.subscribeToChannelsChanges(handleChannelsChanged);

        return unsubscribeFunc;
    }, [moduleContext, broadcaster]);

    const handleChannelsChanged = (channelName: string) => {
        moduleContext.setInputChannel(props.channelName, channelName);
    };

    return (
        <Dropdown
            options={channels.map((el) => ({ label: el, value: el }))}
            value={channel?.getName()}
            onChange={handleChannelsChanged}
            {...rest}
        />
    );
};
