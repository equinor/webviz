import React from "react";

import {
    BroadcastChannel,
    BroadcastChannelKeyCategory,
    Broadcaster,
    checkChannelCompatibility,
} from "@framework/Broadcaster";
import { BaseComponentProps } from "@lib/components/BaseComponent";
import { Dropdown } from "@lib/components/Dropdown";

export type ChannelSelectProps = {
    initialChannel?: string;
    channelKeyCategory?: BroadcastChannelKeyCategory;
    onChange?: (channel: string) => void;
    className?: string;
    broadcaster: Broadcaster;
} & BaseComponentProps;

export const ChannelSelect: React.FC<ChannelSelectProps> = (props) => {
    const { channelKeyCategory, onChange, broadcaster, ...rest } = props;
    const [channel, setChannel] = React.useState<string>(props.initialChannel ?? "");
    const [channels, setChannels] = React.useState<string[]>([]);

    React.useEffect(() => {
        const handleChannelsChanged = (channels: BroadcastChannel[]) => {
            setChannels(
                channels
                    .filter(
                        (el) =>
                            !props.channelKeyCategory ||
                            checkChannelCompatibility(el.getDataDef(), props.channelKeyCategory)
                    )
                    .map((el) => el.getName())
            );

            if (channels.length === 0 || !channels.find((el) => el.getName() === channel)) {
                setChannel("");
                if (onChange) {
                    onChange("");
                }
            }
        };

        const unsubscribeFunc = broadcaster.subscribeToChannelsChanges(handleChannelsChanged);

        return unsubscribeFunc;
    }, [channelKeyCategory, onChange, broadcaster]);

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
