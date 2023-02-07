import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { LayoutElement, Workbench } from "@framework/Workbench";
import {
    MANHATTAN_LENGTH,
    Point,
    Rect,
    Size,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
    rectContainsPoint,
    scaleRectIndividually,
} from "@framework/utils/geometry";

import { ViewWrapper } from "./viewWrapper";

type LayoutProps = {
    workbench: Workbench;
    activeModuleId: string | null;
    moduleInstances: ModuleInstance<any>[];
};

export enum LayoutEventTypes {
    MODULE_INSTANCE_POINTER_DOWN = "MODULE_INSTANCE_POINTER_DOWN",
}

export interface LayoutEvents {
    [LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN]: CustomEvent<{
        id: string;
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

function calcNewLayout(
    layoutSize: Size,
    oldLayout: LayoutElement[],
    relativePointerPosition: Point,
    draggedModuleInstanceId: string
): [true, LayoutElement[]] | [false] {
    // Find module instance at pointer position
    const hoveredModule = oldLayout.find((layoutElement) => {
        const rect: Rect = scaleRectIndividually(
            {
                x: layoutElement.x,
                y: layoutElement.y,
                width: layoutElement.width,
                height: layoutElement.height,
            },
            layoutSize.width,
            layoutSize.height
        );
        return rectContainsPoint(
            {
                x: rect.x + 1,
                y: rect.y + 1,
                width: rect.width - 2,
                height: rect.height - 2,
            },
            relativePointerPosition
        );
    });

    if (!hoveredModule) {
        return [false];
    }

    // Find module instance that is being dragged
    const draggedModule = oldLayout.find((layoutElement) => layoutElement.moduleInstanceId === draggedModuleInstanceId);

    if (!draggedModule) {
        return [false];
    }

    if (draggedModule.moduleInstanceId === hoveredModule.moduleInstanceId) {
        return [false];
    }

    // Find out close to which edge of the hovered module instance the pointer is
    const leftEdgeRect: Rect = scaleRectIndividually(
        {
            ...hoveredModule,
            width: hoveredModule.width / 4,
        },
        layoutSize.width,
        layoutSize.height
    );

    if (rectContainsPoint(leftEdgeRect, relativePointerPosition)) {
        let totalHeight = 0;
        oldLayout.forEach((layoutElement) => {
            if (layoutElement.moduleInstanceId === draggedModule.moduleInstanceId) {
                return;
            }
            totalHeight = Math.max(totalHeight, layoutElement.y + layoutElement.height);
        });
        return [
            true,
            oldLayout.map((layoutElement) => {
                if (hoveredModule.y === draggedModule.y) {
                    if (layoutElement.moduleInstanceId === draggedModule.moduleInstanceId) {
                        return {
                            ...layoutElement,
                            x:
                                draggedModule.x > hoveredModule.x
                                    ? hoveredModule.x
                                    : hoveredModule.x - draggedModule.width,
                        };
                    } else if (layoutElement.moduleInstanceId === hoveredModule.moduleInstanceId) {
                        return {
                            ...layoutElement,
                            x:
                                draggedModule.x > hoveredModule.x
                                    ? hoveredModule.x + draggedModule.width
                                    : hoveredModule.x,
                        };
                    } else if (
                        layoutElement.y === hoveredModule.y &&
                        layoutElement.x < draggedModule.x &&
                        layoutElement.x > hoveredModule.x
                    ) {
                        return {
                            ...layoutElement,
                            x: layoutElement.x + draggedModule.width,
                        };
                    } else if (layoutElement.y === hoveredModule.y && layoutElement.x === draggedModule.x) {
                        return {
                            ...layoutElement,
                            x: layoutElement.x - draggedModule.width,
                        };
                    }
                } else {
                    const elementsWithSameYAsHoveredModule = oldLayout.filter(
                        (element) => element.y === hoveredModule.y
                    );
                    const elementsWithSameYAsDraggedModule = oldLayout.filter(
                        (element) => element.y === draggedModule.y
                    );
                    const totalWidth = elementsWithSameYAsHoveredModule.reduce(
                        (total, element) => total + element.width,
                        0
                    );
                    const oldWidth = totalWidth / elementsWithSameYAsHoveredModule.length;
                    const newWidth = totalWidth / (elementsWithSameYAsHoveredModule.length + 1);
                    const scaleX = newWidth / oldWidth;

                    if (layoutElement.moduleInstanceId === draggedModule.moduleInstanceId) {
                        return {
                            ...layoutElement,
                            x: hoveredModule.x * scaleX,
                            y: hoveredModule.y,
                            width: newWidth,
                            height: layoutElement.height / totalHeight,
                        };
                    } else if (layoutElement.moduleInstanceId === hoveredModule.moduleInstanceId) {
                        return {
                            ...layoutElement,
                            x: hoveredModule.x * scaleX + newWidth,
                            width: newWidth,
                            height: layoutElement.height / totalHeight,
                        };
                    } else if (layoutElement.y === hoveredModule.y && layoutElement.x > hoveredModule.x) {
                        return {
                            ...layoutElement,
                            x: layoutElement.x * scaleX + newWidth,
                            width: newWidth,
                            height: layoutElement.height / totalHeight,
                        };
                    } else if (layoutElement.y === hoveredModule.y && layoutElement.x < hoveredModule.x) {
                        return {
                            ...layoutElement,
                            x: layoutElement.x * scaleX,
                            width: newWidth,
                            height: layoutElement.height / totalHeight,
                        };
                    } else if (layoutElement.y === draggedModule.y) {
                        if (layoutElement.x > draggedModule.x) {
                            return {
                                ...layoutElement,
                                x:
                                    ((layoutElement.x - draggedModule.width) *
                                        elementsWithSameYAsDraggedModule.length) /
                                    (elementsWithSameYAsDraggedModule.length - 1),
                                width:
                                    (layoutElement.width * elementsWithSameYAsDraggedModule.length) /
                                    (elementsWithSameYAsDraggedModule.length - 1),
                            };
                        } else {
                            return {
                                ...layoutElement,
                                x:
                                    (layoutElement.x * elementsWithSameYAsDraggedModule.length) /
                                    (elementsWithSameYAsDraggedModule.length - 1),
                                width:
                                    (layoutElement.width * elementsWithSameYAsDraggedModule.length) /
                                    (elementsWithSameYAsDraggedModule.length - 1),
                            };
                        }
                    }
                }
                return layoutElement;
            }),
        ];
    }

    /*
    const rightEdgeRect: Rect = scaleRectIndividually(
        {
            ...hoveredModule,
            x: hoveredModule.x + (hoveredModule.width * 3) / 4,
            width: hoveredModule.width / 4,
        },
        layoutSize.width,
        layoutSize.height
    );
    if (rectContainsPoint(rightEdgeRect, relativePointerPosition)) {
        return [
            true,
            oldLayout.map((layoutElement) => {
                const elementsWithSameY = oldLayout.filter(
                    (element) =>
                        element.y === layoutElement.y && element.moduleInstanceId !== draggedModule.moduleInstanceId
                );
                const totalWidth =
                    elementsWithSameY.reduce((total, element) => total + element.width, 0) + draggedModule.width;

                if (layoutElement === draggedModule) {
                    return {
                        ...layoutElement,
                        x: (hoveredModule.x + hoveredModule.width) / totalWidth,
                        y: hoveredModule.y,
                        width: layoutElement.width / totalWidth,
                        height: hoveredModule.height,
                    };
                } else if (layoutElement === hoveredModule) {
                    return { ...layoutElement, x: hoveredModule.x / totalWidth };
                }
                return layoutElement;
            }),
        ];
    }
    */

    const topEdgeRect: Rect = scaleRectIndividually(
        {
            ...hoveredModule,
            height: hoveredModule.height / 2,
        },
        layoutSize.width,
        layoutSize.height
    );
    if (rectContainsPoint(topEdgeRect, relativePointerPosition)) {
        return [
            true,
            oldLayout.map((layoutElement) => {
                return layoutElement;
            }),
        ];
    }
    const bottomEdgeRect: Rect = scaleRectIndividually(
        {
            ...hoveredModule,
            y: hoveredModule.y + hoveredModule.height / 2,
            height: hoveredModule.height / 2,
        },
        layoutSize.width,
        layoutSize.height
    );

    return [false];
}

export const Layout: React.FC<LayoutProps> = (props) => {
    const [draggedModuleInstanceId, setDraggedModuleInstanceId] = React.useState<string | null>(null);
    const [position, setPosition] = React.useState<Point>({ x: 0, y: 0 });
    const [layout, setLayout] = React.useState<LayoutElement[]>([]);
    const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleSizeChange = () => {
            if (ref.current) {
                const rect = ref.current.getBoundingClientRect();
                setSize({
                    width: rect.width,
                    height: rect.height,
                });
            }
        };

        handleSizeChange();

        window.addEventListener("resize", handleSizeChange);

        return () => {
            window.removeEventListener("resize", handleSizeChange);
        };
    }, []);

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
        let pointerPosition: Point = { x: 0, y: 0 };
        let dragging = false;
        let moduleInstanceId: string | null = null;
        setLayout(props.workbench.getLayout());
        let layout: LayoutElement[] = props.workbench.getLayout();
        let intermediateLayout: LayoutElement[] = props.workbench.getLayout();

        const handlePointerDown = (e: LayoutEvents[LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN]) => {
            pointerDownPoint = e.detail.pointerPoint;
            pointerDownElementPosition = e.detail.elementPosition;
            pointerDownElementId = e.detail.id;
        };

        const handlePointerUp = (e: PointerEvent) => {
            pointerDownPoint = null;
            pointerDownElementPosition = null;
            pointerDownElementId = null;
            setDraggedModuleInstanceId(null);
            moduleInstanceId = null;
            dragging = false;
            document.body.classList.remove("select-none");
            layout = intermediateLayout;
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!pointerDownPoint || !ref.current || !pointerDownElementId || !pointerDownElementPosition) {
                return;
            }
            if (!dragging) {
                if (pointDistance(pointerEventToPoint(e), pointerDownPoint) > MANHATTAN_LENGTH) {
                    setDraggedModuleInstanceId(pointerDownElementId);
                    moduleInstanceId = pointerDownElementId;
                    const rect = ref.current.getBoundingClientRect();
                    setPosition(pointRelativeToDomRect(pointerDownElementPosition, rect));
                    pointerPosition = pointRelativeToDomRect(pointerDownPoint, rect);
                    document.body.classList.add("select-none");
                    dragging = true;
                }
            } else {
                if (!moduleInstanceId) {
                    return;
                }
                const rect = ref.current.getBoundingClientRect();
                setPosition((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
                pointerPosition = { x: pointerPosition.x + e.movementX, y: pointerPosition.y + e.movementY };
                const [layoutChanged, newLayout] = calcNewLayout(
                    { width: rect.width, height: rect.height },
                    layout,
                    pointerPosition,
                    moduleInstanceId
                );
                if (layoutChanged) {
                    setLayout(newLayout);
                    intermediateLayout = newLayout;
                }
            }
        };

        if (ref.current) {
            document.addEventListener(LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN, handlePointerDown);
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("pointermove", handlePointerMove);
        }

        return () => {
            if (ref.current) {
                document.removeEventListener(LayoutEventTypes.MODULE_INSTANCE_POINTER_DOWN, handlePointerDown);
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("pointermove", handlePointerMove);
            }
        };
    }, []);
    return (
        <div ref={ref} className="relative h-full w-full">
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
    );
};
