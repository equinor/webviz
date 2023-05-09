import React from "react";

import { broadcaster } from "@framework/Broadcaster";

import { Dropdown } from "../Dropdown";

export type ChannelSelectProps = {
    onChange?: (channel: string) => void;
};

export const ChannelSelect: React.FC<ChannelSelectProps> = (props) => {
    const [channel, setChannel] = React.useState<string>("");
    const [channels, setChannels] = React.useState<string[]>([]);

    React.useEffect(() => {
        const handleChannelsChanged = (channels: string[]) => {
            setChannels(channels);
        };

        const unsubscribeFunc = broadcaster.subscribeToChannelsChanges(handleChannelsChanged);

        return unsubscribeFunc;
    }, []);

    const handleChannelsChanged = (channel: string) => {
        setChannel(channel);
        if (props.onChange) {
            props.onChange(channel);
        }
    };

    return (
        <Dropdown
            options={channels.map((el) => ({ label: el, value: el }))}
            value={channel}
            onChange={handleChannelsChanged}
        />
    );
};
