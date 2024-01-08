import React from "react";

import { GuiEvent, GuiEventPayloads } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
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
        function handleChannelConnect(inputName: string, moduleInstanceId: string, destinationPoint: Point) {
            const originModuleInstance = props.workbench.getModuleInstance(moduleInstanceId);

            if (!originModuleInstance) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                return;
            }

            const acceptedKeys = props.moduleInstance
                .getInputChannelDefs()
                .find((channelDef) => channelDef.name === inputName)?.keyCategories;

            const channels = Object.values(originModuleInstance.getBroadcastChannels()).filter((channel) => {
                if (!acceptedKeys || acceptedKeys.some((key) => channel.getDataDef().key === key)) {
                    return Object.values(props.moduleInstance.getInputChannels()).every((inputChannel) => {
                        if (inputChannel.getDataDef().key === channel.getDataDef().key) {
                            return true;
                        }
                        return false;
                    });
                }
                return false;
            });

            if (channels.length === 0) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                return;
            }

            if (channels.length > 1) {
                setChannelSelectorCenterPoint(destinationPoint);
                setSelectableChannels(Object.values(channels).map((channel) => channel.getName()));
                setCurrentInputName(inputName);
                return;
            }

            const channelName = Object.values(channels)[0].getName();

            props.moduleInstance.setInputChannel(inputName, channelName);
            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
        },
        [props.moduleInstance, props.workbench, guiMessageBroker]
    );

    const handleChannelDisconnect = React.useCallback(
        function handleChannelDisconnect(inputName: string) {
            props.moduleInstance.removeInputChannel(inputName);
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        },
        [props.moduleInstance, guiMessageBroker]
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
            {props.moduleInstance.getInputChannelDefs().map((channelDef) => {
                return (
                    <InputChannelNode
                        key={channelDef.name}
                        moduleInstanceId={props.moduleInstance.getId()}
                        inputName={channelDef.name}
                        displayName={channelDef.displayName}
                        channelKeyCategories={channelDef.keyCategories}
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
        </div>
    );
};
