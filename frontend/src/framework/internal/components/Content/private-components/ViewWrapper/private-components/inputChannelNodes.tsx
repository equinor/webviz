import React from "react";
import { createPortal } from "react-dom";

import { GuiEvent, GuiEventPayloads } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { Subscriber } from "@framework/internal/DataChannels/Subscriber";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Point } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ChannelSelector, SelectableChannel, SelectedContents } from "./channelSelector";
import { InputChannelNode } from "./inputChannelNode";

export type InputChannelNodesProps = {
    forwardedRef: React.RefObject<HTMLDivElement>;
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
};

export const InputChannelNodes: React.FC<InputChannelNodesProps> = (props) => {
    const [visible, setVisible] = React.useState<boolean>(false);
    const [currentSubscriber, setCurrentSubscriber] = React.useState<Subscriber | null>(null);
    const [currentOriginModuleInstanceId, setCurrentOriginModuleInstanceId] = React.useState<string | null>(null);
    const [channelSelectorCenterPoint, setChannelSelectorCenterPoint] = React.useState<Point | null>(null);
    const [selectableChannels, setSelectableChannels] = React.useState<SelectableChannel[]>([]);
    const [prevSelectedChannelIdent, setPrevSelectedChannelIdent] = React.useState<string | null>(null);
    const [prevSelectedContents, setPrevSelectedContents] = React.useState<SelectedContents | null>(null);

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
        function handleChannelConnect(subscriberIdent: string, moduleInstanceId: string, destinationPoint: Point) {
            const originModuleInstance = props.workbench.getModuleInstance(moduleInstanceId);

            if (!originModuleInstance) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                return;
            }

            const supportedGenres = props.moduleInstance
                .getPublishSubscribeBroker()
                .getSubscribers()
                .find((el) => el.getName() === subscriberIdent)
                ?.getSupportedGenres();

            const channels = originModuleInstance
                .getPublishSubscribeBroker()
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

            const channel = Object.values(channels)[0];

            const subscriber = props.moduleInstance.getPublishSubscribeBroker().getSubscriber(subscriberIdent);

            if (!subscriber) {
                return;
            }

            if (channels.length > 1 || channels[0].getContents().length > 1) {
                const newSelectableChannels: SelectableChannel[] = channels.map((channel) => {
                    return {
                        ident: channel.getIdent(),
                        name: channel.getName(),
                        contents: channel.getContents().map((program) => ({
                            ident: program.getIdent(),
                            name: program.getName(),
                        })),
                    };
                });

                const prevSelectedChannelIdent = subscriber?.getChannel()?.getIdent() ?? null;

                setChannelSelectorCenterPoint(destinationPoint);
                setSelectableChannels(newSelectableChannels);
                setCurrentOriginModuleInstanceId(moduleInstanceId);
                setCurrentSubscriber(subscriber);

                if (prevSelectedChannelIdent !== null && !subscriber.getHasSubscribedToAllContents()) {
                    const prevSelectedContents = {
                        channelIdent: prevSelectedChannelIdent,
                        contentIdents: subscriber.getContentIdents(),
                    };
                    setPrevSelectedContents(prevSelectedContents);
                    setPrevSelectedChannelIdent(null);
                } else {
                    setPrevSelectedContents(null);
                    setPrevSelectedChannelIdent(prevSelectedChannelIdent);
                }
                return;
            }

            if (!subscriber.getSupportedGenres().includes(channels[0].getGenre())) {
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
                .getSubscriber(subscriberIdent)
                ?.unsubscribeFromCurrentChannel();
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        },
        [props.moduleInstance]
    );

    function handleCancelChannelSelection() {
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);
        guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
    }

    function handleProgramSelection(channelIdent: string, contentIdents: string[]) {
        guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);

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
                .getPublishSubscribeBroker()
                .getSubscribers()
                .map((subscriber) => {
                    return (
                        <InputChannelNode
                            key={subscriber.getIdent()}
                            moduleInstanceId={props.moduleInstance.getId()}
                            ident={subscriber.getIdent()}
                            name={subscriber.getName()}
                            supportedGenres={subscriber.getSupportedGenres()}
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
                    onSelect={handleProgramSelection}
                    selectedChannelIdent={prevSelectedChannelIdent ?? undefined}
                    selectedContents={prevSelectedContents ?? undefined}
                />
            )}
        </div>,
        document.body
    );
};
