import React from "react";
import { createPortal } from "react-dom";

import { GuiEvent, GuiEventPayloads } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Point } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ChannelSelector } from "./channelSelector";
import { InputChannelNode } from "./inputChannelNode";

export type InputChannelNodesProps = {
    forwardedRef: React.RefObject<HTMLDivElement>;
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
};

export const InputChannelNodes: React.FC<InputChannelNodesProps> = (props) => {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [currentInputName, setCurrentInputName] = React.useState<string | null>(null);
    const [channelSelectorCenterPoint, setChannelSelectorCenterPoint] = React.useState<Point | null>(null);
    const [selectableChannels, setSelectableChannels] = React.useState<string[]>([]);

    const elementRect = useElementBoundingRect(props.forwardedRef);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    React.useEffect(() => {
        let localVisible = false;

        function handleDataChannelOriginPointerDown() {
            setVisible(true);
            localVisible = true;
        }

        function handleDataChannelDone() {
            setVisible(false);
            localVisible = false;
        }

        function handlePointerUp(e: PointerEvent) {
            if (!localVisible) {
                return;
            }
            if (
                (!e.target || !(e.target as Element).hasAttribute("data-channelconnector")) &&
                !(e.target as Element).closest("#channel-selector-header")
            ) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                setVisible(false);
            }
            e.stopPropagation();
        }

        function handleEditDataChannelConnectionsRequest(
            payload: GuiEventPayloads[GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest]
        ) {
            if (payload.moduleInstanceId !== props.moduleInstance.getId()) {
                return;
            }
            setVisible(true);
            localVisible = true;
        }

        const removeEditDataChannelConnectionsRequestHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest,
            handleEditDataChannelConnectionsRequest
        );

        const removeDataChannelOriginPointerDownHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelOriginPointerDown,
            handleDataChannelOriginPointerDown
        );

        const removeDataChannelDoneHandler = guiMessageBroker.subscribeToEvent(
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
    }, [props.moduleInstance, guiMessageBroker]);

    const handleChannelConnect = React.useCallback(
        function handleChannelConnect(listenerIdent: string, moduleInstanceId: string, destinationPoint: Point) {
            const originModuleInstance = props.workbench.getModuleInstance(moduleInstanceId);

            if (!originModuleInstance) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                return;
            }

            const supportedGenres = props.moduleInstance
                .getBroadcaster()
                .getListeners()
                .find((el) => el.getName() === listenerIdent)
                ?.getSupportedGenres();

            const channels = originModuleInstance
                .getBroadcaster()
                .getChannels()
                .filter((channel) => {
                    if (!supportedGenres || supportedGenres.some((key) => channel.getGenre() === key)) {
                        /*
                    return Object.values(props.moduleInstance.getInputChannels()).every((inputChannel) => {
                        if (inputChannel.getDataDef().key === channel.getDataDef().key) {
                            return true;
                        }
                        return false;
                    });
                    */
                        return true;
                    }
                    return false;
                });

            if (channels.length === 0) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                return;
            }

            if (channels.length > 1) {
                setChannelSelectorCenterPoint(destinationPoint);
                setSelectableChannels(Object.values(channels).map((channel) => channel.getIdent()));
                setCurrentInputName(listenerIdent);
                return;
            }

            const channel = Object.values(channels)[0];

            const listener = props.moduleInstance.getBroadcaster().getListener(listenerIdent);

            if (!listener) {
                return;
            }

            if (!listener.getSupportedGenres().includes(channels[0].getGenre())) {
                return;
            }

            listener.startListeningTo(
                channel,
                channel.getPrograms().map((el) => el.getName())
            );

            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        },
        [props.moduleInstance, props.workbench]
    );

    const handleChannelDisconnect = React.useCallback(
        function handleChannelDisconnect(listenerIdent: string) {
            props.moduleInstance.getBroadcaster().getListener(listenerIdent)?.stopListening();
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        },
        [props.moduleInstance]
    );

    function handleCancelChannelSelection() {
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);
        guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
    }

    function handleChannelSelection(channelName: string) {
        guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);

        if (!currentInputName) {
            return;
        }
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);

        props.moduleInstance.setInputChannel(currentInputName, channelName);
    }

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
            {props.moduleInstance
                .getBroadcaster()
                .getListeners()
                .map((listener) => {
                    return (
                        <InputChannelNode
                            key={listener.getIdent()}
                            moduleInstanceId={props.moduleInstance.getId()}
                            ident={listener.getIdent()}
                            name={listener.getName()}
                            supportedGenres={listener.getSupportedGenres()}
                            workbench={props.workbench}
                            onChannelConnect={handleChannelConnect}
                            onChannelConnectionDisconnect={handleChannelDisconnect}
                        />
                    );
                })}
            {channelSelectorCenterPoint && (
                <ChannelSelector
                    position={channelSelectorCenterPoint}
                    channelNames={selectableChannels}
                    onCancel={handleCancelChannelSelection}
                    onSelectChannel={handleChannelSelection}
                />
            )}
        </div>,
        document.body
    );
};
