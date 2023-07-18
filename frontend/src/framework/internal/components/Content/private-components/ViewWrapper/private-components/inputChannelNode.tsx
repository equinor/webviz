import React from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { useSetStoreValue, useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { Point, pointerEventToPoint, rectContainsPoint } from "@lib/utils/geometry";

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
    const [visible, setVisible] = React.useState<boolean>(false);
    const [hovered, setHovered] = React.useState<boolean>(false);
    const [hasConnection, setHasConnection] = React.useState<boolean>(false);

    const boundingRect = useElementBoundingRect(ref);

    const editDataChannelConnections = useStoreValue(
        props.workbench.getGuiStateStore(),
        "editDataChannelConnectionsForModuleInstanceId"
    );
    const setHighlightedDataChannelConnection = useSetStoreValue(
        props.workbench.getGuiStateStore(),
        "highlightedDataChannelConnection"
    );

    React.useEffect(() => {
        if (!visible) {
            return;
        }
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_CONNECTIONS_CHANGED));
    }, [boundingRect]);

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
        let visible = false;
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

            setVisible(true);
            visible = true;
            moduleInstanceId = e.detail.moduleInstanceId;
        }

        function handlePointerUp(e: PointerEvent) {
            if (isHovered) {
                props.onChannelConnect(props.inputName, moduleInstanceId, pointerEventToPoint(e));
                setHovered(false);
            }
        }

        function handleDataChannelDone() {
            setVisible(false);
            visible = false;
        }

        function handlePointerMove(e: PointerEvent) {
            if (!visible) {
                return;
            }
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
        setHighlightedDataChannelConnection({
            listenerId: props.moduleInstanceId,
            channelName: props.inputName,
        });
    }

    function handlePointerLeave() {
        setHighlightedDataChannelConnection(null);
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
                "text-sm",
                "hover:border-red-500",
                {
                    invisible: !visible && !editDataChannelConnections,
                    "bg-red-500": hovered,
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
                    <XMarkIcon className="w-4 h-4" />
                </IconButton>
            )}
        </div>
    );
};
