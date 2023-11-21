import React from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { GuiEvent, GuiEventPayloads } from "@framework/GuiMessageBroker";
import { Genre, ModuleBroadcasterTopic, ModuleChannelListenerTopic } from "@framework/NewBroadcaster";
import { Workbench } from "@framework/Workbench";
import { IconButton } from "@lib/components/IconButton";
import { Point, pointerEventToPoint, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Remove } from "@mui/icons-material";

export type InputChannelNodeProps = {
    ident: string;
    name: string;
    supportedGenres?: Genre[];
    moduleInstanceId: string;
    onChannelConnect: (inputName: string, moduleInstanceId: string, destinationPoint: Point) => void;
    onChannelConnectionDisconnect: (inputName: string) => void;
    workbench: Workbench;
};

export const InputChannelNode: React.FC<InputChannelNodeProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const removeButtonRef = React.useRef<HTMLButtonElement>(null);
    const [connectable, setConnectable] = React.useState<boolean>(false);
    const [hovered, setHovered] = React.useState<boolean>(false);
    const [hasConnection, setHasConnection] = React.useState<boolean>(false);
    const [editDataChannelConnections, setEditDataChannelConnections] = React.useState<boolean>(false);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    React.useEffect(() => {
        let localHovered = false;
        let localConnectable = false;
        let localModuleInstanceId = "";
        let localEditDataChannelConnections = false;

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

            const channels = originModuleInstance.getBroadcaster().getChannels();
            const channelGenres: Genre[] = [];
            for (const channelName in channels) {
                channelGenres.push(channels[channelName].getGenre());
            }

            if (props.supportedGenres && !props.supportedGenres.some((genre) => channelGenres.includes(genre))) {
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
                } else if (!localConnectable && !localEditDataChannelConnections) {
                    setHovered(false);
                    localHovered = false;
                    guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest);
                }
            }
            guiMessageBroker.publishEvent(GuiEvent.DataChannelPointerUp);
            e.stopPropagation();
        }

        function handleEditDataChannelConnectionsRequest() {
            setEditDataChannelConnections(true);
            localEditDataChannelConnections = true;
        }

        function handleDataChannelDone() {
            localConnectable = false;
            setConnectable(false);
            setHovered(false);
            localHovered = false;
            setEditDataChannelConnections(false);
            localEditDataChannelConnections = false;
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

            const listener = moduleInstance.getBroadcaster().getListener(props.ident);
            const hasConnection = listener?.isListening() ?? false;
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

        const removeShowDataChannelConnectionsRequestHandler = guiMessageBroker.subscribeToEvent(
            GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest,
            handleEditDataChannelConnectionsRequest
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
            ?.getBroadcaster()
            .getListener(props.ident)
            ?.subscribe(ModuleChannelListenerTopic.ChannelChange, checkIfConnection);

        return () => {
            removeDataChannelDoneHandler();
            removeDataChannelOriginPointerDownHandler();
            removeShowDataChannelConnectionsRequestHandler();

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
        props.supportedGenres,
    ]);

    function handlePointerEnter() {
        guiMessageBroker.publishEvent(GuiEvent.HighlightDataChannelConnectionRequest, {
            moduleInstanceId: props.moduleInstanceId,
            dataChannelName: props.ident,
        });

        guiMessageBroker.publishEvent(GuiEvent.DataChannelNodeHover, {
            connectionAllowed: connectable,
        });
    }

    function handlePointerLeave() {
        guiMessageBroker.publishEvent(GuiEvent.UnhighlightDataChannelConnectionRequest);
        guiMessageBroker.publishEvent(GuiEvent.DataChannelNodeUnhover);
    }

    return (
        <div
            id={`channel-connector-${props.moduleInstanceId}-${props.ident}`}
            ref={ref}
            data-channelconnector
            className={resolveClassNames(
                "flex flex-col items-center justify-center rounded border p-4 h-20 m-2 gap-2 text-sm",
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
            {props.name}
            <IconButton
                ref={removeButtonRef}
                className={resolveClassNames("m-0 hover:bg-white hover:text-red-600", {
                    "text-white": hovered,
                    "text-red-600": !hovered,
                    hidden: !editDataChannelConnections || !hasConnection,
                })}
                title="Remove data channel connection"
            >
                <Remove fontSize="small" />
            </IconButton>
        </div>
    );
};
