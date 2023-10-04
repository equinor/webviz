import React from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { GuiEvent } from "@framework/GuiMessageBroker";
import { useSetStoreValue, useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { IconButton } from "@lib/components/IconButton";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Point, pointerEventToPoint, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close } from "@mui/icons-material";

import { DataChannelEventTypes } from "../../DataChannelVisualization";

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
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_CONNECTIONS_CHANGED));
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

        function handleDataChannelOriginPointerDown(
            e: CustomEvent<{ moduleInstanceId: string; originElement: HTMLElement }>
        ) {
            const originModuleInstance = props.workbench.getModuleInstance(e.detail.moduleInstanceId);
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
            moduleInstanceId = e.detail.moduleInstanceId;
        }

        function handlePointerUp(e: PointerEvent) {
            if (isHovered) {
                if (isConnectable) {
                    props.onChannelConnect(props.inputName, moduleInstanceId, pointerEventToPoint(e));
                } else {
                    document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
                }
                setHovered(false);
                isHovered = false;
            }
        }

        function handleDataChannelDone() {
            setConnectable(false);
            isConnectable = false;
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

        document.addEventListener(
            DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
            handleDataChannelOriginPointerDown
        );
        document.addEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);

        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener("pointermove", handlePointerMove);

        return () => {
            document.removeEventListener(
                DataChannelEventTypes.DATA_CHANNEL_ORIGIN_POINTER_DOWN,
                handleDataChannelOriginPointerDown
            );
            document.removeEventListener(DataChannelEventTypes.DATA_CHANNEL_DONE, handleDataChannelDone);
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

        document.dispatchEvent(
            new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_NODE_HOVER, { detail: { allowed: connectable } })
        );
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
                    className="ml-2 m-0"
                    title="Remove data channel connection"
                >
                    <Close fontSize="small" />
                </IconButton>
            )}
        </div>
    );
};
