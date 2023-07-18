import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { useSetStoreValue, useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { Point, pointDifference, pointRelativeToDomRect, pointerEventToPoint } from "@lib/utils/geometry";

import { ChannelSelector } from "./private-components/channelSelector";
import { Header } from "./private-components/header";
import { InputChannelNode } from "./private-components/inputChannelNode";
import { InputChannelNodeWrapper } from "./private-components/inputChannelNodeWrapper";
import { ViewContent } from "./private-components/viewContent";

import { DataChannelEventTypes } from "../DataChannelVisualization";
import { LayoutEventTypes } from "../layout";
import { ViewWrapperPlaceholder } from "../viewWrapperPlaceholder";

type ViewWrapperProps = {
    isActive: boolean;
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
    width: number;
    height: number;
    x: number;
    y: number;
    isDragged: boolean;
    dragPosition: Point;
};

export const ViewWrapper: React.FC<ViewWrapperProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);

    const [currentInputName, setCurrentInputName] = React.useState<string | null>(null);
    const [channelSelectorCenterPoint, setChannelSelectorCenterPoint] = React.useState<Point | null>(null);
    const [selectableChannels, setSelectableChannels] = React.useState<string[]>([]);

    const showDataChannelConnections = useStoreValue(props.workbench.getGuiStateStore(), "showDataChannelConnections");
    const editDataChannelConnectionsModuleInstanceId = useStoreValue(
        props.workbench.getGuiStateStore(),
        "editDataChannelConnectionsForModuleInstanceId"
    );

    const setShowDataChannelConnections = useSetStoreValue(
        props.workbench.getGuiStateStore(),
        "showDataChannelConnections"
    );

    const setEditDataChannelConnectionsModuleInstanceId = useSetStoreValue(
        props.workbench.getGuiStateStore(),
        "editDataChannelConnectionsForModuleInstanceId"
    );

    const handleHeaderPointerDown = React.useCallback(
        function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
            if (ref.current) {
                const point = pointerEventToPoint(e.nativeEvent);
                const rect = ref.current.getBoundingClientRect();
                document.dispatchEvent(
                    new CustomEvent(LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN, {
                        detail: {
                            id: props.moduleInstance.getId(),
                            elementPosition: pointDifference(point, pointRelativeToDomRect(point, rect)),
                            pointerPoint: point,
                        },
                    })
                );
            }
        },
        [props.moduleInstance]
    );

    const handleModuleInstanceRemoveClick = React.useCallback(
        function handleRemoveClick(e: React.PointerEvent<HTMLDivElement>) {
            document.dispatchEvent(
                new CustomEvent(LayoutEventTypes.REMOVE_MODULE_INSTANCE_REQUEST, {
                    detail: {
                        id: props.moduleInstance.getId(),
                    },
                })
            );
            e.preventDefault();
            e.stopPropagation();
        },
        [props.moduleInstance]
    );

    const handleModuleHeaderClick = React.useCallback(
        function handleModuleHeaderClick() {
            if (props.isActive) return;
            props.workbench.setActiveModuleId(props.moduleInstance.getId());
        },
        [props.moduleInstance, props.workbench, props.isActive]
    );

    function handleInputChannelsClick(e: React.PointerEvent<HTMLDivElement>): void {
        setShowDataChannelConnections(true);
        setEditDataChannelConnectionsModuleInstanceId(props.moduleInstance.getId());
        e.stopPropagation();
    }

    function handleChannelConnect(inputName: string, moduleInstanceId: string, destinationPoint: Point) {
        const originModuleInstance = props.workbench.getModuleInstance(moduleInstanceId);

        if (!originModuleInstance) {
            document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
            return;
        }

        const acceptedKeys = props.moduleInstance
            .getInputChannelDefs()
            .find((channelDef) => channelDef.name === inputName)?.keyCategories;

        const channels = Object.values(originModuleInstance.getBroadcastChannels()).filter((channel) => {
            if (!acceptedKeys || acceptedKeys.some((key) => channel.getDataDef().key === key)) {
                return Object.values(props.moduleInstance.getInputChannels()).every((inputChannel) => {
                    if (inputChannel.getDataDef().key === channel.getDataDef().key) {
                        return true;
                    }
                    return false;
                });
            }
            return false;
        });

        if (channels.length === 0) {
            document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
            return;
        }

        if (channels.length > 1) {
            setChannelSelectorCenterPoint(destinationPoint);
            setSelectableChannels(Object.values(channels).map((channel) => channel.getName()));
            setCurrentInputName(inputName);
            return;
        }

        const channelName = Object.values(channels)[0].getName();

        props.moduleInstance.setInputChannel(inputName, channelName);
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
    }

    function handleChannelDisconnect(inputName: string) {
        props.moduleInstance.removeInputChannel(inputName);
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_CONNECTIONS_CHANGED));
    }

    function handleCancelChannelSelection() {
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
    }

    function handleChannelSelection(channelName: string) {
        if (!currentInputName) {
            return;
        }
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);

        props.moduleInstance.setInputChannel(currentInputName, channelName);
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
    }

    const channelConnectorWrapperVisible =
        showDataChannelConnections &&
        (editDataChannelConnectionsModuleInstanceId === null ||
            editDataChannelConnectionsModuleInstanceId === props.moduleInstance.getId());

    return (
        <>
            {props.isDragged && (
                <ViewWrapperPlaceholder width={props.width} height={props.height} x={props.x} y={props.y} />
            )}
            <div
                ref={ref}
                className="absolute box-border p-1"
                style={{
                    width: props.width,
                    height: props.height,
                    left: props.isDragged ? props.dragPosition.x : props.x,
                    top: props.isDragged ? props.dragPosition.y : props.y,
                    zIndex: props.isDragged ? 1 : 0,
                    opacity: props.isDragged ? 0.5 : 1,
                }}
            >
                <div
                    className={`bg-white h-full w-full flex flex-col ${
                        props.isActive ? "border-blue-500" : ""
                    } border-solid border-2 box-border shadow ${
                        props.isDragged ? "cursor-grabbing select-none" : "cursor-grab"
                    }}`}
                    onClick={handleModuleHeaderClick}
                >
                    <Header
                        moduleInstance={props.moduleInstance}
                        isDragged={props.isDragged}
                        onPointerDown={handleHeaderPointerDown}
                        onRemoveClick={handleModuleInstanceRemoveClick}
                        onInputChannelsClick={handleInputChannelsClick}
                    />
                    <div className="flex-grow overflow-auto h-0">
                        <ViewContent workbench={props.workbench} moduleInstance={props.moduleInstance} />
                        <InputChannelNodeWrapper forwardedRef={ref} visible={channelConnectorWrapperVisible}>
                            {props.moduleInstance.getInputChannelDefs().map((channelDef) => {
                                return (
                                    <InputChannelNode
                                        key={channelDef.name}
                                        moduleInstanceId={props.moduleInstance.getId()}
                                        inputName={channelDef.name}
                                        displayName={channelDef.displayName}
                                        channelKeyCategories={channelDef.keyCategories}
                                        workbench={props.workbench}
                                        onChannelConnect={handleChannelConnect}
                                        onChannelConnectionDisconnect={handleChannelDisconnect}
                                    />
                                );
                            })}
                        </InputChannelNodeWrapper>
                        {channelSelectorCenterPoint && (
                            <ChannelSelector
                                position={channelSelectorCenterPoint}
                                channelNames={selectableChannels}
                                onCancel={handleCancelChannelSelection}
                                onSelectChannel={handleChannelSelection}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
