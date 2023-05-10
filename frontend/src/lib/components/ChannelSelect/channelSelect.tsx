import React from "react";

import { BroadcastChannel, BroadcastChannelDef, broadcaster, checkChannelCompatibility } from "@framework/Broadcaster";

import { Dropdown } from "../Dropdown";
import { BaseComponentProps } from "../_BaseComponent";

function checkIfChannelDefMatchesFilter(channelDefs: BroadcastChannelDef, filter: BroadcastChannelDef) {
    return checkChannelCompatibility(channelDefs, filter);
}

export type ChannelSelectProps = {
    channelFilter?: BroadcastChannelDef;
    onChange?: (channel: string) => void;
} & BaseComponentProps;

export const ChannelSelect: React.FC<ChannelSelectProps> = (props) => {
    const { channelFilter, onChange, ...rest } = props;
    const [channel, setChannel] = React.useState<string>("");
    const [channels, setChannels] = React.useState<string[]>([]);

    React.useEffect(() => {
        const handleChannelsChanged = (channels: BroadcastChannel<any>[]) => {
            setChannels(
                channels
                    .filter(
                        (el) =>
                            !props.channelFilter || checkIfChannelDefMatchesFilter(el.getDataDef(), props.channelFilter)
                    )
                    .map((el) => el.getName())
            );
        };

        const unsubscribeFunc = broadcaster.subscribeToChannelsChanges(handleChannelsChanged);

        return unsubscribeFunc;
    }, [channelFilter]);

    const handleChannelsChanged = (channel: string) => {
        setChannel(channel);
        if (onChange) {
            onChange(channel);
        }
    };

    return (
        <Dropdown
            options={channels.map((el) => ({ label: el, value: el }))}
            value={channel}
            onChange={handleChannelsChanged}
            {...rest}
        />
    );
};
