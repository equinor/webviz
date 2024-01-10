import React from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { GuiEvent, GuiEventPayloads } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { IconButton } from "@lib/components/IconButton";
import { Point, pointerEventToPoint, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Remove } from "@mui/icons-material";

export type InputChannelNodeProps = {
    inputName: string;
    displayName: string;
    channelKeyCategories?: BroadcastChannelKeyCategory[];
    moduleInstanceId: string;
    onChannelConnect: (inputName: string, moduleInstanceId: string, destinationPoint: Point) => void;
    onChannelConnectionDisconnect: (inputName: string) => void;
    workbench: Workbench;
};

export const InputChannelNode: React.FC<InputChannelNodeProps> = (props) => {
    const { onChannelConnect, onChannelConnectionDisconnect } = props;

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
        const refCurrent = ref.current;

        const moduleInstance = props.workbench.getModuleInstance(props.moduleInstanceId);

        function handleDataChannelOriginPointerDown(payload: GuiEventPayloads[GuiEvent.DataChannelOriginPointerDown]) {
            localConnectable = false;
            setConnectable(false);
            localModuleInstanceId = "";

            const originModuleInstance = props.workbench.getModuleInstance(payload.moduleInstanceId);
            if (!originModuleInstance) {
                return;
            }
            const dataChannels = originModuleInstance.getBroadcastChannels();
            const channelKeyCategories: BroadcastChannelKeyCategory[] = [];
            for (const dataChannelName in dataChannels) {
                channelKeyCategories.push(dataChannels[dataChannelName].getDataDef().key);
            }

            if (
                props.channelKeyCategories &&
                !channelKeyCategories.some(
                    (channelKeyCategory) =>
                        props.channelKeyCategories && props.channelKeyCategories.includes(channelKeyCategory)
                )
            ) {
                return;
            }

            if (!moduleInstance) {
                return;
            }

            const alreadySetInputChannels = moduleInstance.getInputChannels();

            const alreadySetInputKeys: BroadcastChannelKeyCategory[] = [];

            for (const channelName in alreadySetInputChannels) {
                alreadySetInputKeys.push(alreadySetInputChannels[channelName].getDataDef().key);
            }

            if (
                alreadySetInputKeys.length > 0 &&
                !alreadySetInputKeys.some((key) => channelKeyCategories.includes(key))
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
                    onChannelConnectionDisconnect(props.inputName);
                    setHovered(false);
                    localHovered = false;
                } else if (localConnectable) {
                    onChannelConnect(props.inputName, localModuleInstanceId, pointerEventToPoint(e));
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
            if (!localHovered && boundingRect && rectContainsPoint(boundingRect, pointerEventToPoint(e))) {
                setHovered(true);
                localHovered = true;
                return;
            }
            if (localHovered) {
                setHovered(false);
                localHovered = false;
            }
        }

        function checkIfConnection() {
            const moduleInstance = props.workbench.getModuleInstance(props.moduleInstanceId);
            if (!moduleInstance) {
                return;
            }

            const inputChannels = moduleInstance.getInputChannels();
            const hasConnection = props.inputName in inputChannels;
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

        const unsubscribeFunc = moduleInstance?.subscribeToInputChannelsChange(checkIfConnection);

        return () => {
            removeDataChannelDoneHandler();
            removeDataChannelOriginPointerDownHandler();
            removeShowDataChannelConnectionsRequestHandler();

            refCurrent?.removeEventListener("pointerup", handlePointerUp);
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
        props.inputName,
        props.channelKeyCategories,
        guiMessageBroker,
    ]);

    function handlePointerEnter() {
        guiMessageBroker.publishEvent(GuiEvent.HighlightDataChannelConnectionRequest, {
            moduleInstanceId: props.moduleInstanceId,
            dataChannelName: props.inputName,
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
            id={`channel-connector-${props.moduleInstanceId}-${props.inputName}`}
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
            {props.displayName}
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
