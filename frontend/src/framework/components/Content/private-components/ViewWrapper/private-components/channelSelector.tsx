import React from "react";
import { createPortal } from "react-dom";

import { Point } from "@framework/utils/geometry";

export type ChannelSelectorProps = {
    channelNames: string[];
    position: Point;
    onSelectChannel: (channelName: string) => void;
    onCancel: () => void;
};

export const ChannelSelector: React.FC<ChannelSelectorProps> = (props) => {
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest("#channel-selector")) {
                return;
            }
            props.onCancel();
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [props.onCancel]);

    return createPortal(
        <div
            id="channel-selector"
            className="absolute bg-white max-h-52 border rounded overflow-auto z-50 shadow"
            style={{
                left: props.position.x < window.innerWidth / 2 ? props.position.x : undefined,
                top: props.position.y < window.innerHeight / 2 ? props.position.y : undefined,
                right: props.position.x > window.innerWidth / 2 ? window.innerWidth - props.position.x : undefined,
                bottom: props.position.y > window.innerHeight / 2 ? window.innerHeight - props.position.y : undefined,
            }}
        >
            <div className="p-2 bg-slate-200 font-bold">Select a channel</div>
            {props.channelNames.map((channelName) => {
                return (
                    <div
                        key={channelName}
                        className="p-2 hover:bg-blue-50 cursor-pointer"
                        onClick={() => props.onSelectChannel(channelName)}
                    >
                        {channelName}
                    </div>
                );
            })}
        </div>,
        document.body
    );
};
