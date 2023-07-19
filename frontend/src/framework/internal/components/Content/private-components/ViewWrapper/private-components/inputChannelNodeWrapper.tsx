import React from "react";
import { createPortal } from "react-dom";

import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

import { DataChannelEventTypes } from "../../DataChannelVisualization/dataChannelVisualization";

export type InputChannelNodeWrapperProps = {
    children: React.ReactNode;
    forwardedRef: React.RefObject<HTMLDivElement>;
    visible: boolean;
};

export const InputChannelNodeWrapper: React.FC<InputChannelNodeWrapperProps> = (props) => {
    const [visible, setVisible] = React.useState<boolean>(false);
    const elementRect = useElementBoundingRect(props.forwardedRef);

    React.useEffect(() => {
        let isVisible = false;
        function handleDataChannelOriginPointerDown() {
            setVisible(true);
            isVisible = true;
        }

        function handleDataChannelDone() {
            setVisible(false);
            isVisible = false;
        }

        function handlePointerUp(e: PointerEvent) {
            if (!isVisible) {
                return;
            }
            if (
                (!e.target || !(e.target as Element).hasAttribute("data-channelconnector")) &&
                !(e.target as Element).closest("#channel-selector-header")
            ) {
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

    return createPortal(
        <div
            className={resolveClassNames("absolute", "flex", "items-center", "justify-center", "z-50", {
                invisible: !visible && !props.visible,
            })}
            style={{
                left: elementRect.x,
                top: elementRect.y,
                width: elementRect.width,
                height: elementRect.height,
            }}
        >
            {props.children}
        </div>,
        document.body
    );
};
