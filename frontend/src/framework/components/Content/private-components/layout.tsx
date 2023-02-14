import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { LayoutElement, Workbench } from "@framework/Workbench";
import {
    MANHATTAN_LENGTH,
    Point,
    Rect,
    pointDifference,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
} from "@framework/utils/geometry";
import { useSize } from "@lib/hooks/useSize";

import { LayoutBox, LayoutBoxComponents, makeLayoutBoxes } from "./LayoutBox";
import { ModulesList } from "./modulesList";
import { ViewWrapper } from "./viewWrapper";

type LayoutProps = {
    workbench: Workbench;
    activeModuleId: string | null;
    moduleInstances: ModuleInstance<any>[];
};

export enum LayoutEventTypes {
    MODULE_INSTANCE_POINTER_DOWN = "MODULE_INSTANCE_POINTER_DOWN",
    NEW_MODULE_POINTER_DOWN = "NEW_MODULE_POINTER_DOWN",
}

export interface LayoutEvents {
    [LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN]: CustomEvent<{
        id: string;
        elementPosition: Point;
        pointerPoint: Point;
    }>;
    [LayoutEventTypes.NEW_MODULE_POINTER_DOWN]: CustomEvent<{
        name: string;
        elementPosition: Point;
        pointerPoint: Point;
    }>;
}

declare global {
    interface Document {
        addEventListener<K extends keyof LayoutEvents>(
            type: K,
            listener: (ev: LayoutEvents[K]) => any,
            options?: boolean | AddEventListenerOptions
        ): void;
        removeEventListener<K extends keyof LayoutEvents>(
            type: K,
            listener: (ev: LayoutEvents[K]) => any,
            options?: boolean | EventListenerOptions
        ): void;
        dispatchEvent<K extends keyof LayoutEvents>(event: LayoutEvents[K]): void;
    }
}

export const Layout: React.FC<LayoutProps> = (props) => {
    const [draggedModuleInstanceId, setDraggedModuleInstanceId] = React.useState<string | null>(null);
    const [position, setPosition] = React.useState<Point>({ x: 0, y: 0 });
    const [layout, setLayout] = React.useState<LayoutElement[]>([]);
    const ref = React.useRef<HTMLDivElement>(null);
    const size = useSize(ref);
    const layoutBoxRef = React.useRef<LayoutBox | null>(null);

    const convertLayoutRectToRealRect = React.useCallback(
        (element: LayoutElement): Rect => {
            return {
                x: element.x * size.width,
                y: element.y * size.height,
                width: element.width * size.width,
                height: element.height * size.height,
            };
        },
        [size]
    );

    React.useEffect(() => {
        let pointerDownPoint: Point | null = null;
        let pointerDownElementPosition: Point | null = null;
        let pointerDownElementId: string | null = null;
        let relativePointerPosition: Point = { x: 0, y: 0 };
        let pointerToElementDiff: Point = { x: 0, y: 0 };
        let dragging = false;
        let moduleInstanceId: string | null = null;
        let moduleName: string | null = null;
        setLayout(props.workbench.getLayout());
        let layout: LayoutElement[] = props.workbench.getLayout();
        let layoutBox = makeLayoutBoxes(layout);
        layoutBoxRef.current = layoutBox;

        const handleModuleInstancePointerDown = (e: LayoutEvents[LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN]) => {
            pointerDownPoint = e.detail.pointerPoint;
            pointerDownElementPosition = e.detail.elementPosition;
            pointerDownElementId = e.detail.id;
        };

        const handleNewModulePointerDown = (e: LayoutEvents[LayoutEventTypes.NEW_MODULE_POINTER_DOWN]) => {
            pointerDownPoint = e.detail.pointerPoint;
            pointerDownElementPosition = e.detail.elementPosition;
            moduleName = e.detail.name;
        };

        const handlePointerUp = () => {
            pointerDownPoint = null;
            pointerDownElementPosition = null;
            pointerDownElementId = null;
            setDraggedModuleInstanceId(null);
            moduleInstanceId = null;
            dragging = false;
            document.body.classList.remove("select-none");
            layoutBox = makeLayoutBoxes(layout);
            setLayout(layout);
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (
                !pointerDownPoint ||
                !ref.current ||
                (!pointerDownElementId && !moduleName) ||
                !pointerDownElementPosition
            ) {
                return;
            }
            if (!dragging) {
                if (pointDistance(pointerEventToPoint(e), pointerDownPoint) > MANHATTAN_LENGTH) {
                    setDraggedModuleInstanceId(pointerDownElementId);
                    moduleInstanceId = pointerDownElementId;
                    const rect = ref.current.getBoundingClientRect();
                    setPosition(pointRelativeToDomRect(pointerDownElementPosition, rect));
                    relativePointerPosition = pointRelativeToDomRect(pointerDownPoint, rect);
                    document.body.classList.add("select-none");
                    dragging = true;
                    pointerToElementDiff = pointDifference(pointerDownPoint, pointerDownElementPosition);
                }
            } else {
                if ((!pointerDownElementId && !moduleName) || !pointerDownPoint) {
                    return;
                }
                const rect = ref.current.getBoundingClientRect();
                setPosition(pointDifference(pointDifference(pointerEventToPoint(e), rect), pointerToElementDiff));
                relativePointerPosition = pointDifference(pointerEventToPoint(e), rect);

                if (layoutBox) {
                    let preview: LayoutBox | null = null;
                    if (!moduleInstanceId && moduleName) {
                        const moduleInstance = props.workbench.addModule(moduleName);
                        moduleInstanceId = moduleInstance.getId();
                        setDraggedModuleInstanceId(moduleInstanceId);
                    }
                    if (moduleInstanceId) {
                        preview = layoutBox.previewLayout(relativePointerPosition, size, moduleInstanceId);
                    }
                    if (preview) {
                        layoutBox = preview;
                        layout = preview.toLayout();
                        setLayout(layout);
                        layoutBoxRef.current = layoutBox;
                    }
                }
            }
        };
        document.addEventListener(LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN, handleModuleInstancePointerDown);
        document.addEventListener(LayoutEventTypes.NEW_MODULE_POINTER_DOWN, handleNewModulePointerDown);
        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener("pointermove", handlePointerMove);

        return () => {
            document.removeEventListener(
                LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN,
                handleModuleInstancePointerDown
            );
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("pointermove", handlePointerMove);
        };
    }, [size]);
    return (
        <div className="relative flex h-full w-full">
            <div ref={ref} className="h-full flex-grow">
                {layoutBoxRef.current && (
                    <LayoutBoxComponents
                        active={null}
                        layoutBox={layoutBoxRef.current}
                        realSize={size}
                        zIndex={1}
                        pointer={position}
                    />
                )}
                {props.moduleInstances.map((instance) => {
                    const layoutElement = layout.find((element) => element.moduleInstanceId === instance.getId());
                    if (!layoutElement) {
                        return null;
                    }
                    const rect = convertLayoutRectToRealRect(layoutElement);
                    const isDragged = draggedModuleInstanceId === instance.getId();
                    return (
                        <ViewWrapper
                            key={instance.getId()}
                            moduleInstance={instance}
                            workbench={props.workbench}
                            isActive={props.activeModuleId === instance.getId()}
                            width={rect.width}
                            height={rect.height}
                            x={rect.x}
                            y={rect.y}
                            isDragged={isDragged}
                            dragPosition={position}
                        />
                    );
                })}
            </div>
            <ModulesList workbench={props.workbench} />
        </div>
    );
};
