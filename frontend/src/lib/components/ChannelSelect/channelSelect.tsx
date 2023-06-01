import React from "react";

import {
    BroadcastChannel,
    BroadcastChannelKeyCategory,
    broadcaster,
    checkChannelCompatibility,
} from "@framework/Broadcaster";

import { Dropdown } from "../Dropdown";
import { BaseComponentProps } from "../_BaseComponent";

export type ChannelSelectProps = {
    initialChannel?: string;
    channelKeyCategory?: BroadcastChannelKeyCategory;
    onChange?: (channel: string) => void;
    className?: string;
} & BaseComponentProps;

export const ChannelSelect: React.FC<ChannelSelectProps> = (props) => {
    // eslint-disable-next-line react/destructuring-assignment
    const { channelKeyCategory, onChange, ...rest } = props;
    const [channel, setChannel] = React.useState<string>(props.initialChannel ?? "");
    const [channels, setChannels] = React.useState<string[]>([]);

    React.useEffect(() => {
        const handleChannelsChanged = (channels: BroadcastChannel<any>[]) => {
            setChannels(
                channels
                    .filter(
                        (el) =>
                            !props.channelKeyCategory ||
                            checkChannelCompatibility(el.getDataDef(), props.channelKeyCategory)
                    )
                    .map((el) => el.getName())
            );
        };

        const unsubscribeFunc = broadcaster.subscribeToChannelsChanges(handleChannelsChanged);

        return unsubscribeFunc;
    }, [channelKeyCategory]);

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
