import React from "react";
import { createPortal } from "react-dom";

import { GuiEvent, GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { ModuleChannelReceiver } from "@framework/internal/DataChannels/ModuleChannelReceiver";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Point } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ChannelSelector, SelectableChannel, SelectedContents } from "./channelContentSelector";
import { ChannelReceiverNode } from "./channelReceiverNode";

export type ChannelReceiverNodesWrapperProps = {
    forwardedRef: React.RefObject<HTMLDivElement>;
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
};

export const ChannelReceiverNodesWrapper: React.FC<ChannelReceiverNodesWrapperProps> = (props) => {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [currentSubscriber, setCurrentSubscriber] = React.useState<ModuleChannelReceiver | null>(null);
    const [currentOriginModuleInstanceId, setCurrentOriginModuleInstanceId] = React.useState<string | null>(null);
    const [channelSelectorCenterPoint, setChannelSelectorCenterPoint] = React.useState<Point | null>(null);
    const [selectableChannels, setSelectableChannels] = React.useState<SelectableChannel[]>([]);
    const [prevSelectedChannelIdent, setPrevSelectedChannelIdent] = React.useState<string | null>(null);
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
            removeDataChannelDoneHandler();
            removeDataChannelOriginPointerDownHandler();
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, [props.moduleInstance, guiMessageBroker, channelSelectorCenterPoint, editDataChannelConnections]);

    const handleChannelConnect = React.useCallback(
        function handleChannelConnect(subscriberIdent: string, moduleInstanceId: string, destinationPoint: Point) {
            const originModuleInstance = props.workbench.getModuleInstance(moduleInstanceId);

            if (!originModuleInstance) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                return;
            }

            const supportedKindsOfKey = props.moduleInstance
                .getPublishSubscribeBroker()
                .getReceivers()
                .find((el) => el.getDisplayName() === subscriberIdent)
                ?.getSupportedKindsOfKeys();

            const channels = originModuleInstance
                .getPublishSubscribeBroker()
                .getChannels()
                .filter((channel) => {
                    if (!supportedKindsOfKey || supportedKindsOfKey.some((key) => channel.getKindOfKey() === key)) {
                        return props.moduleInstance
                            .getPublishSubscribeBroker()
                            .getReceivers()
                            .every((subscriber) => {
                                if (!subscriber.hasActiveSubscription()) {
                                    return true;
                                }
                                if (subscriber.getChannel()?.getKindOfKey() === channel.getKindOfKey()) {
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

            const subscriber = props.moduleInstance.getPublishSubscribeBroker().getReceiver(subscriberIdent);

            if (!subscriber) {
                return;
            }

            if (channels.length > 1 || channels[0].getContents().length > 1) {
                const newSelectableChannels: SelectableChannel[] = channels.map((channel) => {
                    return {
                        idString: channel.getIdString(),
                        displayName: channel.getDisplayName(),
                        contents: channel.getContents().map((content) => ({
                            idString: content.getIdString(),
                            displayName: content.getDisplayName(),
                        })),
                    };
                });

                const prevSelectedChannelIdent = subscriber?.getChannel()?.getIdString() ?? null;

                setChannelSelectorCenterPoint(destinationPoint);
                setSelectableChannels(newSelectableChannels);
                setCurrentOriginModuleInstanceId(moduleInstanceId);
                setCurrentSubscriber(subscriber);

                if (prevSelectedChannelIdent !== null && !subscriber.getHasSubscribedToAllContents()) {
                    const prevSelectedContents = {
                        channelIdent: prevSelectedChannelIdent,
                        contentIdents: subscriber.getContentIdStrings(),
                    };
                    setPrevSelectedContents(prevSelectedContents);
                    setPrevSelectedChannelIdent(null);
                } else {
                    setPrevSelectedContents(null);
                    setPrevSelectedChannelIdent(prevSelectedChannelIdent);
                }
                return;
            }

            if (!subscriber.getSupportedKindsOfKeys().includes(channels[0].getKindOfKey())) {
                return;
            }

            subscriber.subscribeToChannel(channel, "All");

            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        },
        [props.moduleInstance, props.workbench]
    );

    const handleChannelDisconnect = React.useCallback(
        function handleChannelDisconnect(subscriberIdent: string) {
            props.moduleInstance
                .getPublishSubscribeBroker()
                .getReceiver(subscriberIdent)
                ?.unsubscribeFromCurrentChannel();
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        },
        [props.moduleInstance]
    );

    function handleCancelChannelSelection() {
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);
        if (!editDataChannelConnections) {
            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
        }
    }

    function handleContentSelection(channelIdent: string, contentIdents: string[]) {
        if (!editDataChannelConnections) {
            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
        }

        if (!currentSubscriber) {
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

        const subscriber = currentSubscriber;
        const channel = originModuleInstance.getPublishSubscribeBroker().getChannel(channelIdent);

        setCurrentSubscriber(null);
        setCurrentOriginModuleInstanceId(null);

        if (!subscriber || !channel) {
            return;
        }

        if (contentIdents.length === 0) {
            subscriber.subscribeToChannel(channel, "All");
            return;
        }

        subscriber.subscribeToChannel(channel, contentIdents);
    }

    return createPortal(
        <div
            className={resolveClassNames("absolute flex items-center justify-center z-50", {
                invisible: !editDataChannelConnections && !visible,
            })}
            style={{
                left: elementRect.x,
                top: elementRect.y,
                width: elementRect.width,
                height: elementRect.height,
            }}
        >
            {props.moduleInstance
                .getPublishSubscribeBroker()
                .getReceivers()
                .map((subscriber) => {
                    return (
                        <ChannelReceiverNode
                            key={subscriber.getIdString()}
                            moduleInstanceId={props.moduleInstance.getId()}
                            ident={subscriber.getIdString()}
                            name={subscriber.getDisplayName()}
                            supportedKindsOfKey={subscriber.getSupportedKindsOfKeys()}
                            workbench={props.workbench}
                            onChannelConnect={handleChannelConnect}
                            onChannelConnectionDisconnect={handleChannelDisconnect}
                        />
                    );
                })}
            {channelSelectorCenterPoint && currentSubscriber && (
                <ChannelSelector
                    subscriber={currentSubscriber}
                    position={channelSelectorCenterPoint}
                    selectableChannels={selectableChannels}
                    onCancel={handleCancelChannelSelection}
                    onSelect={handleContentSelection}
                    selectedChannelIdent={prevSelectedChannelIdent ?? undefined}
                    selectedContents={prevSelectedContents ?? undefined}
                />
            )}
        </div>,
        document.body
    );
};
