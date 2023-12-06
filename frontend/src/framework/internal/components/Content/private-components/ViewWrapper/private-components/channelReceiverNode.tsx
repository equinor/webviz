import React from "react";

import { KeyKind } from "@framework/DataChannelTypes";
import { GuiEvent, GuiEventPayloads, GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { ModuleChannelReceiverNotificationTopic } from "@framework/internal/DataChannels/ModuleChannelReceiver";
import { IconButton } from "@lib/components/IconButton";
import { Point, pointerEventToPoint, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Edit, Remove } from "@mui/icons-material";

export type ChannelReceiverNodeProps = {
    ident: string;
    name: string;
    supportedKindsOfKey?: readonly KeyKind[];
    moduleInstanceId: string;
    onChannelConnect: (inputName: string, moduleInstanceId: string, destinationPoint: Point) => void;
    onChannelConnectionDisconnect: (inputName: string) => void;
    workbench: Workbench;
};

export const ChannelReceiverNode: React.FC<ChannelReceiverNodeProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const removeButtonRef = React.useRef<HTMLButtonElement>(null);
    const editButtonRef = React.useRef<HTMLButtonElement>(null);
    const [connectable, setConnectable] = React.useState<boolean>(false);
    const [hovered, setHovered] = React.useState<boolean>(false);
    const [hasConnection, setHasConnection] = React.useState<boolean>(false);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const [editDataChannelConnections, setEditDataChannelConnections] = useGuiState(
        guiMessageBroker,
        GuiState.EditDataChannelConnections
    );

    React.useEffect(() => {
        let localHovered = false;
        let localConnectable = false;
        let localModuleInstanceId = "";

        const moduleInstance = props.workbench.getModuleInstance(props.moduleInstanceId);

        function handleDataChannelOriginPointerDown(payload: GuiEventPayloads[GuiEvent.DataChannelOriginPointerDown]) {
            localConnectable = false;
            setConnectable(false);
            localModuleInstanceId = "";

            const originModuleInstance = props.workbench.getModuleInstance(payload.moduleInstanceId);
            if (!originModuleInstance) {
                return;
            }

            if (!moduleInstance) {
                return;
            }

            const channels = originModuleInstance.getPublishSubscribeBroker().getChannels();
            const channelKeyKinds: KeyKind[] = [];
            for (const channelName in channels) {
                channelKeyKinds.push(channels[channelName].getKindOfKey());
            }

            if (
                props.supportedKindsOfKey &&
                !props.supportedKindsOfKey.some((kind) => channelKeyKinds.includes(kind))
            ) {
                return;
            }

            setConnectable(true);
            localConnectable = true;
            localModuleInstanceId = payload.moduleInstanceId;
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        }

        function handlePointerUp(e: PointerEvent) {
            if (localHovered) {
                if (removeButtonRef.current && removeButtonRef.current.contains(e.target as Node)) {
                    props.onChannelConnectionDisconnect(props.ident);
                    setHovered(false);
                    setHasConnection(false);
                    localHovered = false;
                } else if (localConnectable) {
                    props.onChannelConnect(props.ident, localModuleInstanceId, pointerEventToPoint(e));
                    setHovered(false);
                    localHovered = false;
                } else if (!localConnectable && !editDataChannelConnections) {
                    setHovered(false);
                    localHovered = false;
                    guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                }
            }
            guiMessageBroker.publishEvent(GuiEvent.DataChannelPointerUp);
            e.stopPropagation();
        }

        function handleDataChannelDone() {
            localConnectable = false;
            setConnectable(false);
            setHovered(false);
            localHovered = false;
            setEditDataChannelConnections(false);
        }

        function handlePointerMove(e: PointerEvent) {
            const boundingRect = ref.current?.getBoundingClientRect();
            if (boundingRect && rectContainsPoint(boundingRect, pointerEventToPoint(e))) {
                setHovered(true);
                localHovered = true;
                return;
            }
            if (localHovered) {
                setHovered(false);
                localHovered = false;
            }
        }

        function handleResize() {
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        }

        function checkIfConnection() {
            const moduleInstance = props.workbench.getModuleInstance(props.moduleInstanceId);
            if (!moduleInstance) {
                return;
            }

            const listener = moduleInstance.getPublishSubscribeBroker().getReceiver(props.ident);
            const hasConnection = listener?.hasActiveSubscription() ?? false;
            setHasConnection(hasConnection);
        }

        const removeDataChannelOriginPointerDownHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.DataChannelOriginPointerDown,
            handleDataChannelOriginPointerDown
        );
        const removeDataChannelDoneHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.HideDataChannelConnectionsRequest,
            handleDataChannelDone
        );

        ref.current?.addEventListener("pointerup", handlePointerUp, true);
        document.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("resize", handleResize);

        const resizeObserver = new ResizeObserver(handleResize);

        if (ref.current) {
            handleResize();
            resizeObserver.observe(ref.current);
        }

        const unsubscribeFunc = moduleInstance
            ?.getPublishSubscribeBroker()
            .getReceiver(props.ident)
            ?.subscribe(ModuleChannelReceiverNotificationTopic.ChannelChange, checkIfConnection);

        return () => {
            removeDataChannelDoneHandler();
            removeDataChannelOriginPointerDownHandler();

            ref.current?.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("resize", handleResize);

            resizeObserver.disconnect();

            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };
    }, [
        props.onChannelConnect,
        props.onChannelConnectionDisconnect,
        props.workbench,
        props.moduleInstanceId,
        props.ident,
        props.supportedKindsOfKey,
        editDataChannelConnections,
    ]);

    function handlePointerEnter() {
        guiMessageBroker.publishEvent(GuiEvent.HighlightDataChannelConnectionRequest, {
            moduleInstanceId: props.moduleInstanceId,
            listenerIdent: props.ident,
        });

        guiMessageBroker.publishEvent(GuiEvent.DataChannelNodeHover, {
            connectionAllowed: connectable,
        });
    }

    function handlePointerLeave() {
        guiMessageBroker.publishEvent(GuiEvent.UnhighlightDataChannelConnectionRequest);
        guiMessageBroker.publishEvent(GuiEvent.DataChannelNodeUnhover);
    }

    const moduleInstance = props.workbench.getModuleInstance(props.moduleInstanceId);
    const listener = moduleInstance?.getPublishSubscribeBroker().getReceiver(props.ident);
    const channel = listener?.getChannel();

    function handleEditChannelClick(e: React.PointerEvent<HTMLButtonElement>) {
        if (!channel) {
            return;
        }
        props.onChannelConnect(
            props.ident,
            channel.getManager().getModuleInstanceId(),
            pointerEventToPoint(e.nativeEvent)
        );
    }

    let hasMultiplePossibleConnections = false;
    if (channel) {
        hasMultiplePossibleConnections =
            channel
                .getManager()
                .getChannels()
                .filter((el) => props.supportedKindsOfKey?.includes(el.getKindOfKey())).length > 1;
        if (!hasMultiplePossibleConnections) {
            hasMultiplePossibleConnections = channel.getContents().length > 1;
        }
    }

    return (
        <div
            id={`channel-connector-${props.moduleInstanceId}-${props.ident}`}
            ref={ref}
            data-channelconnector
            className={resolveClassNames(
                "w-40 flex flex-col items-center justify-center rounded border h-20 m-2 gap-2 text-sm text-center",
                {
                    "bg-green-600 border-green-600": hovered && connectable,
                    "bg-red-600 border-red-600": hovered && !connectable && !editDataChannelConnections,
                    "bg-blue-600 border-blue-600": hovered && !connectable && editDataChannelConnections,
                    "opacity-50": !connectable && !editDataChannelConnections,
                    "bg-slate-100": !hovered,
                    "text-white": hovered,
                    "shadow-md": hasConnection,
                }
            )}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
        >
            <div className="h-16 flex items-center">{props.name}</div>
            <div
                className={resolveClassNames(
                    "flex gap-2 bg-slate-200 w-full rounded-b items-center justify-center p-1",
                    {
                        hidden: !editDataChannelConnections,
                    }
                )}
            >
                <IconButton
                    ref={editButtonRef}
                    className="m-0 hover:bg-white hover:text-blue-600"
                    title="Edit data channel connection"
                    disabled={!hasConnection || !hasMultiplePossibleConnections}
                    size="small"
                    onClick={handleEditChannelClick}
                >
                    <Edit fontSize="small" />
                </IconButton>
                <IconButton
                    ref={removeButtonRef}
                    className="m-0 hover:bg-white text-red-600"
                    title="Remove data channel connection"
                    disabled={!hasConnection}
                    size="small"
                >
                    <Remove fontSize="small" />
                </IconButton>
            </div>
        </div>
    );
};
