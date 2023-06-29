import React from "react";
import { createPortal } from "react-dom";

import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

import { DataChannelEventTypes } from "../../DataChannelVisualization/dataChannelVisualization";

export type ChannelConnectorWrapperProps = {
    children: React.ReactNode;
    forwardedRef: React.RefObject<HTMLDivElement>;
};

export const ChannelConnectorWrapper: React.FC<ChannelConnectorWrapperProps> = (props) => {
    const [visible, setVisible] = React.useState<boolean>(false);

    React.useEffect(() => {
        function handleDataChannelOriginPointerDown() {
            setVisible(true);
        }

        function handleDataChannelDone() {
            setVisible(false);
        }

        function handlePointerUp(e: PointerEvent) {
            if (!e.target || !(e.target as Element).hasAttribute("data-channelconnector")) {
                document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
            }
        }

        document.addEventListener(
            DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
            handleDataChannelOriginPointerDown
        );

        document.addEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);
        document.addEventListener("pointerup", handlePointerUp);

        return () => {
            document.removeEventListener(
                DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
                handleDataChannelOriginPointerDown
            );
            document.removeEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, []);

    const refBoundingRect = props.forwardedRef?.current?.getBoundingClientRect();
    const refWidth = refBoundingRect?.width ?? 0;
    const refHeight = refBoundingRect?.height ?? 0;
    const refLeft = refBoundingRect?.left ?? 0;
    const refTop = refBoundingRect?.top ?? 0;

    return createPortal(
        <div
            className={resolveClassNames("absolute", "flex", "items-center", "justify-center", "z-50", {
                invisible: !visible,
            })}
            style={{
                left: refLeft,
                top: refTop,
                width: refWidth,
                height: refHeight,
            }}
        >
            {props.children}
        </div>,
        document.body
    );
};
