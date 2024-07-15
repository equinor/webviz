import React from "react";

import { KeyKind } from "@framework/DataChannelTypes";
import { GuiEvent, GuiEventPayloads, GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { ChannelReceiverNotificationTopic } from "@framework/internal/DataChannels/ChannelReceiver";
import { IconButton } from "@lib/components/IconButton";
import { rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vector2, vector2FromPointerEvent, } from "@lib/utils/vector2";
import { Edit, Remove } from "@mui/icons-material";

export type ChannelReceiverNodeProps = {
    idString: string;
    displayName: string;
    supportedKindsOfKeys?: readonly KeyKind[];
    moduleInstanceId: string;
    onChannelConnect: (inputName: string, moduleInstanceId: string, destinationPoint: Vector2) => void;
    onChannelConnectionDisconnect: (inputName: string) => void;
    workbench: Workbench;
    hoverable: boolean;
};

export const ChannelReceiverNode: React.FC<ChannelReceiverNodeProps> = (props) => {
    const { onChannelConnect, onChannelConnectionDisconnect } = props;

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

            const channels = originModuleInstance.getChannelManager().getChannels();
            const channelKeyKinds: KeyKind[] = [];
            for (const channelName in channels) {
                channelKeyKinds.push(channels[channelName].getKindOfKey());
            }

            if (
                props.supportedKindsOfKeys &&
                !props.supportedKindsOfKeys.some((kind) => channelKeyKinds.includes(kind))
            ) {
                return;
            }

            setConnectable(true);
            localConnectable = true;
            localModuleInstanceId = payload.moduleInstanceId;
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange);
        }

        function handlePointerUp(e: PointerEvent) {
            const el = document.elementFromPoint(e.pageX, e.pageY);
            if (!el || !ref.current || !ref.current.contains(el)) {
                return;
            }
            if (removeButtonRef.current && removeButtonRef.current.contains(e.target as Node)) {
                onChannelConnectionDisconnect(props.idString);
                setHovered(false);
                setHasConnection(false);
            } else if (localConnectable) {
                onChannelConnect(props.idString, localModuleInstanceId, vector2FromPointerEvent(e));
                setHovered(false);
            } else if (!localConnectable && !editDataChannelConnections) {
                setHovered(false);
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
            }
            guiMessageBroker.publishEvent(GuiEvent.DataChannelPointerUp);
            e.stopPropagation();
        }

        function handleDataChannelDone() {
            localConnectable = false;
            setConnectable(false);
            setHovered(false);
            setEditDataChannelConnections(false);
        }

        function handlePointerMove(e: PointerEvent) {
            if (!editDataChannelConnections && !localConnectable) {
                return;
            }
            const boundingRect = ref.current?.getBoundingClientRect();
            if (boundingRect && rectContainsPoint(boundingRect, vector2FromPointerEvent(e))) {
                setHovered(true);
                return;
            }
            setHovered(false);
        }

        function checkIfConnection() {
            const moduleInstance = props.workbench.getModuleInstance(props.moduleInstanceId);
            if (!moduleInstance) {
                return;
            }

            const receiver = moduleInstance.getChannelManager().getReceiver(props.idString);
            const hasConnection = receiver?.hasActiveSubscription() ?? false;
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

        document.addEventListener("pointerup", handlePointerUp, true);
        document.addEventListener("pointermove", handlePointerMove);

        const unsubscribeFunc = moduleInstance
            ?.getChannelManager()
            .getReceiver(props.idString)
            ?.subscribe(ChannelReceiverNotificationTopic.CHANNEL_CHANGE, checkIfConnection);

        checkIfConnection();

        return () => {
            removeDataChannelDoneHandler();
            removeDataChannelOriginPointerDownHandler();

            document.removeEventListener("pointerup", handlePointerUp, true);
            document.removeEventListener("pointermove", handlePointerMove);

            if (unsubscribeFunc) {
                unsubscribeFunc();
            }
        };
    }, [
        onChannelConnect,
        onChannelConnectionDisconnect,
        props.workbench,
        props.moduleInstanceId,
        props.idString,
        props.supportedKindsOfKeys,
        editDataChannelConnections,
        guiMessageBroker,
        setEditDataChannelConnections,
    ]);

    function handlePointerEnter() {
        guiMessageBroker.publishEvent(GuiEvent.HighlightDataChannelConnectionRequest, {
            moduleInstanceId: props.moduleInstanceId,
            receiverIdString: props.idString,
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
    const receiver = moduleInstance?.getChannelManager().getReceiver(props.idString);
    const channel = receiver?.getChannel();

    function handleEditChannelClick(e: React.PointerEvent<HTMLButtonElement>) {
        if (!channel) {
            return;
        }
        props.onChannelConnect(
            props.idString,
            channel.getManager().getModuleInstanceId(),
            vector2FromPointerEvent(e.nativeEvent)
        );
    }

    let hasMultiplePossibleConnections = false;
    if (channel) {
        hasMultiplePossibleConnections =
            channel
                .getManager()
                .getChannels()
                .filter((el) => props.supportedKindsOfKeys?.includes(el.getKindOfKey())).length > 1;
        if (!hasMultiplePossibleConnections) {
            hasMultiplePossibleConnections = channel.getContents().length > 1;
        }
    }

    const hoveredAndHoverable = hovered && props.hoverable;

    return (
        <div
            id={`channel-connector-${props.moduleInstanceId}-${props.idString}`}
            ref={ref}
            data-channelconnector
            className={resolveClassNames(
                "w-40 max-w-[25%] flex flex-col items-center justify-center rounded border h-20 max-h-[25%] m-2 gap-2 text-sm text-center",
                {
                    "bg-green-600 border-green-600": hoveredAndHoverable && connectable,
                    "bg-red-600 border-red-600": hoveredAndHoverable && !connectable && !editDataChannelConnections,
                    "bg-blue-600 border-blue-600": hoveredAndHoverable && !connectable && editDataChannelConnections,
                    "opacity-50": !connectable && !editDataChannelConnections,
                    "bg-slate-100": !hoveredAndHoverable,
                    "text-white": hoveredAndHoverable,
                    "shadow-md": hasConnection,
                }
            )}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
        >
            <div className="h-16 flex items-center">{props.displayName}</div>
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
