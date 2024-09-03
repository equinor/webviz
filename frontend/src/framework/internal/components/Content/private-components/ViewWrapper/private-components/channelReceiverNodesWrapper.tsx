import React from "react";

import { GuiEvent, GuiEventPayloads, GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { ChannelReceiver } from "@framework/internal/DataChannels/ChannelReceiver";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vec2 } from "@lib/utils/vec2";

import { ChannelSelector, SelectableChannel, SelectedContents } from "./channelContentSelector";
import { ChannelReceiverNode } from "./channelReceiverNode";

export type ChannelReceiverNodesWrapperProps = {
    forwardedRef: React.RefObject<HTMLDivElement>;
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
};

export const ChannelReceiverNodesWrapper: React.FC<ChannelReceiverNodesWrapperProps> = (props) => {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [currentReceiver, setCurrentReceiver] = React.useState<ChannelReceiver | null>(null);
    const [currentOriginModuleInstanceId, setCurrentOriginModuleInstanceId] = React.useState<string | null>(null);
    const [channelSelectorCenterPoint, setChannelSelectorCenterPoint] = React.useState<Vec2 | null>(null);
    const [selectableChannels, setSelectableChannels] = React.useState<SelectableChannel[]>([]);
    const [prevSelectedChannelIdString, setPrevSelectedChannelIdString] = React.useState<string | null>(null);
    const [prevSelectedContents, setPrevSelectedContents] = React.useState<SelectedContents | null>(null);

    const elementRect = useElementBoundingRect(props.forwardedRef);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [editDataChannelConnections, setEditDataChannelConnections] = useGuiState(
        guiMessageBroker,
        GuiState.EditDataChannelConnections
    );

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
            if (!localVisible && !editDataChannelConnections) {
                return;
            }
            if (!channelSelectorCenterPoint) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                setVisible(false);
                localVisible = false;
                setEditDataChannelConnections(false);
            }
            e.stopPropagation();
        }

        function handleEditDataChannelConnectionsChange(
            payload: GuiEventPayloads[GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest]
        ) {
            if (payload.moduleInstanceId !== props.moduleInstance.getId()) {
                setVisible(false);
                localVisible = false;
                return;
            }
            setVisible(true);
            localVisible = true;
        }

        const removeEditDataChannelConnectionsHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest,
            handleEditDataChannelConnectionsChange
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
            removeEditDataChannelConnectionsHandler();
            removeDataChannelDoneHandler();
            removeDataChannelOriginPointerDownHandler();
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, [
        props.moduleInstance,
        guiMessageBroker,
        channelSelectorCenterPoint,
        editDataChannelConnections,
        setEditDataChannelConnections,
    ]);

    const handleChannelConnect = React.useCallback(
        function handleChannelConnect(receiverIdString: string, moduleInstanceId: string, destinationPoint: Vec2) {
            const originModuleInstance = props.workbench.getModuleInstance(moduleInstanceId);

            if (!originModuleInstance) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                return;
            }

            const supportedKindsOfKeys = props.moduleInstance
                .getChannelManager()
                .getReceivers()
                .find((el) => el.getDisplayName() === receiverIdString)
                ?.getSupportedKindsOfKeys();

            const channels = originModuleInstance
                .getChannelManager()
                .getChannels()
                .filter((channel) => {
                    if (!supportedKindsOfKeys || supportedKindsOfKeys.some((key) => channel.getKindOfKey() === key)) {
                        return props.moduleInstance
                            .getChannelManager()
                            .getReceivers()
                            .every((receiver) => {
                                if (!receiver.hasActiveSubscription()) {
                                    return true;
                                }
                                if (receiver.getChannel()?.getKindOfKey() === channel.getKindOfKey()) {
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

            const channel = Object.values(channels)[0];

            const receiver = props.moduleInstance.getChannelManager().getReceiver(receiverIdString);

            if (!receiver) {
                return;
            }

            if (channels.length > 1 || channels[0].getContents().length > 1) {
                const newSelectableChannels: SelectableChannel[] = channels.map((channel) => {
                    return {
                        idString: channel.getIdString(),
                        displayName: channel.getDisplayName(),
                        contents: channel.getContents().map((content) => ({
                            contentIdString: content.getIdString(),
                            displayName: content.getDisplayName(),
                        })),
                    };
                });

                const prevSelectedChannelIdString = receiver?.getChannel()?.getIdString() ?? null;

                setChannelSelectorCenterPoint(destinationPoint);
                setSelectableChannels(newSelectableChannels);
                setCurrentOriginModuleInstanceId(moduleInstanceId);
                setCurrentReceiver(receiver);

                if (prevSelectedChannelIdString !== null && !receiver.getHasSubscribedToAllContents()) {
                    const prevSelectedContents = {
                        channelIdString: prevSelectedChannelIdString,
                        contentIdStrings: receiver.getContentIdStrings(),
                    };
                    setPrevSelectedContents(prevSelectedContents);
                    setPrevSelectedChannelIdString(null);
                } else {
                    setPrevSelectedContents(null);
                    setPrevSelectedChannelIdString(prevSelectedChannelIdString);
                }
                return;
            }

            if (!receiver.getSupportedKindsOfKeys().includes(channels[0].getKindOfKey())) {
                return;
            }

            receiver.subscribeToChannel(channel, "All");

            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        },
        [props.moduleInstance, props.workbench, guiMessageBroker]
    );

    const handleChannelDisconnect = React.useCallback(
        function handleChannelDisconnect(receiverIdString: string) {
            props.moduleInstance.getChannelManager().getReceiver(receiverIdString)?.unsubscribeFromCurrentChannel();
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        },
        [props.moduleInstance, guiMessageBroker]
    );

    function handleCancelChannelSelection() {
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);
        if (!editDataChannelConnections) {
            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
        }
    }

    function handleContentSelection(channelIdString: string, contentIdStrings: string[]) {
        if (!editDataChannelConnections) {
            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
        }

        if (!currentReceiver) {
            return;
        }
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);

        if (!currentOriginModuleInstanceId) {
            return;
        }
        const originModuleInstance = props.workbench.getModuleInstance(currentOriginModuleInstanceId);

        if (!originModuleInstance) {
            return;
        }

        const receiver = currentReceiver;
        const channel = originModuleInstance.getChannelManager().getChannel(channelIdString);

        setCurrentReceiver(null);
        setCurrentOriginModuleInstanceId(null);

        if (!receiver || !channel) {
            return;
        }

        if (contentIdStrings.length === 0) {
            receiver.subscribeToChannel(channel, "All");
            return;
        }

        receiver.subscribeToChannel(channel, contentIdStrings);
    }

    const channelSelectorVisible = channelSelectorCenterPoint !== null && currentReceiver !== null;

    return createPortal(
        <div
            className={resolveClassNames("absolute flex items-center justify-center z-50 flex-", {
                invisible: !((editDataChannelConnections && visible) || visible),
            })}
            style={{
                left: elementRect.x,
                top: elementRect.y,
                width: elementRect.width,
                height: elementRect.height,
            }}
        >
            {props.moduleInstance
                .getChannelManager()
                .getReceivers()
                .map((receiver) => {
                    return (
                        <ChannelReceiverNode
                            key={receiver.getIdString()}
                            moduleInstanceId={props.moduleInstance.getId()}
                            idString={receiver.getIdString()}
                            displayName={receiver.getDisplayName()}
                            supportedKindsOfKeys={receiver.getSupportedKindsOfKeys()}
                            workbench={props.workbench}
                            onChannelConnect={handleChannelConnect}
                            onChannelConnectionDisconnect={handleChannelDisconnect}
                            hoverable={!channelSelectorVisible}
                        />
                    );
                })}
            {channelSelectorVisible && (
                <ChannelSelector
                    receiver={currentReceiver}
                    position={channelSelectorCenterPoint}
                    selectableChannels={selectableChannels}
                    onCancel={handleCancelChannelSelection}
                    onSelect={handleContentSelection}
                    selectedChannelIdString={prevSelectedChannelIdString ?? undefined}
                    selectedContents={prevSelectedContents ?? undefined}
                />
            )}
        </div>
    );
};
