import React from "react";
import { createPortal } from "react-dom";

import { Overlay } from "@lib/components/Overlay";
import { Point } from "@lib/utils/geometry";
import { Close } from "@mui/icons-material";

export type ChannelSelectorProps = {
    channelNames: string[];
    position: Point;
    onSelectChannel: (channelName: string) => void;
    onCancel: () => void;
};

export const ChannelSelector: React.FC<ChannelSelectorProps> = (props) => {
    React.useEffect(() => {
        const handleClickOutside = (e: PointerEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest("#channel-selector-header")) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            if (target.closest("#channel-selector")) {
                return;
            }
            props.onCancel();
        };

        document.addEventListener("pointerdown", handleClickOutside);

        return () => {
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [props.onCancel]);

    return createPortal(
        <>
            <Overlay visible />
            <div
                id="channel-selector"
                className="absolute bg-white max-h-52 border rounded overflow-auto z-50 shadow"
                style={{
                    left: props.position.x < window.innerWidth / 2 ? props.position.x : undefined,
                    top: props.position.y < window.innerHeight / 2 ? props.position.y : undefined,
                    right: props.position.x > window.innerWidth / 2 ? window.innerWidth - props.position.x : undefined,
                    bottom:
                        props.position.y > window.innerHeight / 2 ? window.innerHeight - props.position.y : undefined,
                }}
            >
                <div id="channel-selector-header" className="p-2 bg-slate-200 font-bold text-xs flex">
                    <div className="flex-grow">Select a channel</div>
                    <div className="hover:text-slate-500 cursor-pointer" onClick={props.onCancel}>
                        <Close fontSize="small" />
                    </div>
                </div>
                {props.channelNames.map((channelName) => {
                    return (
                        <div
                            key={channelName}
                            className="p-2 hover:bg-blue-50 cursor-pointer text-xs"
                            onClick={() => props.onSelectChannel(channelName)}
                        >
                            {channelName}
                        </div>
                    );
                })}
            </div>
        </>,
        document.body
    );
};
