import React from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { GuiEvent, GuiEventPayloads } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { IconButton } from "@lib/components/IconButton";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Point, pointerEventToPoint, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close } from "@mui/icons-material";

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
    const ref = React.useRef<HTMLDivElement>(null);
    const [connectable, setConnectable] = React.useState<boolean>(false);
    const [hovered, setHovered] = React.useState<boolean>(false);
    const [hasConnection, setHasConnection] = React.useState<boolean>(false);
    const [editDataChannelConnections, setEditDataChannelConnections] = React.useState<boolean>(false);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const boundingRect = useElementBoundingRect(ref);

    React.useLayoutEffect(() => {
        guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange, {});
    }, [boundingRect, connectable]);

    React.useEffect(() => {
        const moduleInstance = props.workbench.getModuleInstance(props.moduleInstanceId);
        if (!moduleInstance) {
            return;
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

        const unsubscribeFunc = moduleInstance.subscribeToInputChannelsChange(checkIfConnection);

        return () => {
            unsubscribeFunc();
        };
    }, [props.moduleInstanceId, props.inputName, props.workbench]);

    React.useEffect(() => {
        let isHovered = false;
        let isConnectable = false;
        let moduleInstanceId = "";

        const moduleInstance = props.workbench.getModuleInstance(props.moduleInstanceId);

        function handleDataChannelOriginPointerDown(payload: GuiEventPayloads[GuiEvent.DataChannelOriginPointerDown]) {
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
            isConnectable = true;
            moduleInstanceId = payload.moduleInstanceId;
        }

        function handlePointerUp(e: PointerEvent) {
            if (isHovered) {
                if (isConnectable) {
                    props.onChannelConnect(props.inputName, moduleInstanceId, pointerEventToPoint(e));
                } else {
                    guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest, {});
                }
                setHovered(false);
                isHovered = false;
            }
        }

        function handleEditDataChannelConnectionsRequest() {
            setEditDataChannelConnections(true);
        }

        function handleDataChannelDone() {
            setConnectable(false);
            isConnectable = false;
            setEditDataChannelConnections(false);
        }

        function handlePointerMove(e: PointerEvent) {
            const boundingRect = ref.current?.getBoundingClientRect();
            if (boundingRect && rectContainsPoint(boundingRect, pointerEventToPoint(e))) {
                setHovered(true);
                isHovered = true;
                return;
            }
            setHovered(false);
            isHovered = false;
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

        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener("pointermove", handlePointerMove);

        return () => {
            removeDataChannelDoneHandler();
            removeDataChannelOriginPointerDownHandler();
            removeShowDataChannelConnectionsRequestHandler();

            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
        };
    }, [props.onChannelConnect, props.workbench, props.moduleInstanceId, props.inputName, props.channelKeyCategories]);

    function handleChannelConnectionRemoveClick(e: React.PointerEvent<HTMLButtonElement>) {
        e.stopPropagation();
        props.onChannelConnectionDisconnect(props.inputName);
    }

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
        guiMessageBroker.publishEvent(GuiEvent.UnhighlightDataChannelConnectionRequest, {});
    }

    return (
        <div
            id={`channel-connector-${props.moduleInstanceId}-${props.inputName}`}
            ref={ref}
            data-channelconnector
            className={resolveClassNames(
                "flex",
                "items-center",
                "justify-center",
                "rounded",
                "border",
                "p-4",
                "m-2",
                "h-16",
                "text-sm",
                {
                    "hover:border-red-600": !connectable,
                    "hover:border-green-600": connectable,
                    "bg-green-600": hovered && connectable,
                    "bg-red-600": hovered && !connectable,
                    "bg-slate-100": !hovered,
                    "text-white": hovered,
                }
            )}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
        >
            {props.displayName}
            {editDataChannelConnections && hasConnection && (
                <IconButton
                    onPointerUp={handleChannelConnectionRemoveClick}
                    className="ml-2 m-0 text-white"
                    title="Remove data channel connection"
                >
                    <Close fontSize="small" />
                </IconButton>
            )}
        </div>
    );
};
