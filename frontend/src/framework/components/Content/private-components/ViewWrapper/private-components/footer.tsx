import React from "react";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

export type FooterProps = {
    inputChannels: {
        name: string;
        displayName: string;
    }[];
    onMouseEnterDataChannel: (channelName: string) => void;
    onMouseLeaveDataChannel: (channelName: string) => void;
    onChannelRemoveClick: (channelName: string) => void;
};

export const Footer: React.FC<FooterProps> = (props) => {
    const [isHovered, setIsHovered] = React.useState<boolean>(false);
    const [hoveredChannel, setHoveredChannel] = React.useState<string>("");

    if (props.inputChannels.length === 0) {
        return null;
    }

    function handleMouseEnter() {
        setIsHovered(true);
    }

    function handleMouseLeave() {
        setIsHovered(false);
    }

    function handleChannelEnter(channelName: string) {
        setHoveredChannel(channelName);
        props.onMouseEnterDataChannel(channelName);
    }

    function handleChannelLeave(channelName: string) {
        setHoveredChannel("");
        props.onMouseLeaveDataChannel(channelName);
    }

    return (
        <div
            className="bg-slate-100 p-1 pl-4 pr-4 select-none overflow-hidden flex flex-col shadow-inner"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ height: isHovered ? "60px" : "26px", transition: "height 0.2s ease-in-out" }}
        >
            <div className="mr-2 text-xs p-1">{props.inputChannels.length} Input Channels</div>
            <div className="flex">
                {props.inputChannels.map((channel) => {
                    return (
                        <div
                            key={channel.name}
                            className={resolveClassNames(
                                "flex",
                                {
                                    "bg-blue-500": hoveredChannel !== channel.name,
                                    "bg-red-500": hoveredChannel === channel.name,
                                },
                                "text-white",
                                "mr-2",
                                "rounded-md",
                                "text-xs",
                                "cursor-help"
                            )}
                            onMouseEnter={() => handleChannelEnter(channel.name)}
                            onMouseLeave={() => handleChannelLeave(channel.name)}
                        >
                            <div className="p-1 pl-2 pr-2">{channel.displayName}</div>
                            <div
                                className={resolveClassNames(
                                    "hover:text-slate-300",
                                    "cursor-pointer",
                                    "p-1",
                                    {
                                        "bg-blue-600": hoveredChannel !== channel.name,
                                        "bg-red-600": hoveredChannel === channel.name,
                                    },
                                    "rounded-md"
                                )}
                                onClick={() => props.onChannelRemoveClick(channel.name)}
                                title="Remove channel"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

Footer.displayName = "Footer";
