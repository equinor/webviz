import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { useSetStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { Point, pointRelativeToDomRect, pointerEventToPoint } from "@framework/utils/geometry";

import { Footer } from "./private-components/footer";
import { Header } from "./private-components/header";
import { ViewContent } from "./private-components/viewContent";

import { pointDifference } from "../../../../utils/geometry";
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
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const [inputChannels, setInputChannels] = React.useState<
        {
            name: string;
            displayName: string;
        }[]
    >([]);

    React.useEffect(() => {
        function handleInputChannelsChange() {
            setInputChannels(
                Object.entries(props.moduleInstance.getInputChannels()).map(([name, channel]) => ({
                    name,
                    displayName:
                        props.moduleInstance.getInputChannelDefs().find((c) => c.name === name)?.displayName || "",
                }))
            );
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToInputChannelsChange(handleInputChannelsChange);

        return unsubscribeFunc;
    }, [props.moduleInstance]);

    const setHighlightedDataChannelConnection = useSetStoreValue(
        props.workbench.getGuiStateStore(),
        "highlightedDataChannelConnection"
    );

    const setShowDataChannelConnections = useSetStoreValue(
        props.workbench.getGuiStateStore(),
        "showDataChannelConnections"
    );

    const handlePointerDown = React.useCallback(
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

    const handleRemoveClick = React.useCallback(
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

    function handleDataChannelMouseEnter(channelName: string): void {
        setHighlightedDataChannelConnection({
            listenerId: props.moduleInstance.getId(),
            channelName: channelName,
        });

        setShowDataChannelConnections(true);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }

    function handleDataChannelMouseLeave(): void {
        setHighlightedDataChannelConnection(null);

        timeoutRef.current = setTimeout(() => {
            setShowDataChannelConnections(false);
        }, 500);
    }

    function handleChannelRemove(channelName: string): void {
        props.moduleInstance.removeInputChannel(channelName);
        handleDataChannelMouseLeave();
    }

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
                        onPointerDown={handlePointerDown}
                        onRemoveClick={handleRemoveClick}
                    />
                    <div className="flex-grow overflow-auto h-0">
                        <ViewContent workbench={props.workbench} moduleInstance={props.moduleInstance} />
                    </div>
                    <Footer
                        inputChannels={inputChannels}
                        onMouseEnterDataChannel={handleDataChannelMouseEnter}
                        onMouseLeaveDataChannel={handleDataChannelMouseLeave}
                        onChannelRemoveClick={handleChannelRemove}
                    />
                </div>
            </div>
        </>
    );
};
