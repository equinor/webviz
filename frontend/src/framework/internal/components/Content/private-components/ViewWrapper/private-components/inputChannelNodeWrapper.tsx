import React from "react";
import { createPortal } from "react-dom";

import { GuiEvent, GuiEventPayloads, GuiMessageBroker } from "@framework/GuiMessageBroker";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type InputChannelNodeWrapperProps = {
    children: React.ReactNode;
    forwardedRef: React.RefObject<HTMLDivElement>;
    moduleInstanceId: string;
    guiMessageBroker: GuiMessageBroker;
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
                props.guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest, {});
                setVisible(false);
            }
            e.stopPropagation();
        }

        function handleEditDataChannelConnectionsRequest(
            payload: GuiEventPayloads[GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest]
        ) {
            if (payload.moduleInstanceId !== props.moduleInstanceId) {
                return;
            }
            setVisible(true);
            isVisible = true;
        }

        const removeEditDataChannelConnectionsRequestHandler = props.guiMessageBroker.subscribeToEvent(
            GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest,
            handleEditDataChannelConnectionsRequest
        );

        const removeDataChannelOriginPointerDownHandler = props.guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelOriginPointerDown,
            handleDataChannelOriginPointerDown
        );

        const removeDataChannelDoneHandler = props.guiMessageBroker.subscribeToEvent(
            GuiEvent.HideDataChannelConnectionsRequest,
            handleDataChannelDone
        );

        document.addEventListener("pointerup", handlePointerUp);

        return () => {
            removeEditDataChannelConnectionsRequestHandler();
            removeDataChannelDoneHandler();
            removeDataChannelOriginPointerDownHandler();
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, [props.moduleInstanceId, props.guiMessageBroker]);

    return createPortal(
        <div
            className={resolveClassNames("absolute flex items-center justify-center z-50", {
                invisible: !visible,
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
