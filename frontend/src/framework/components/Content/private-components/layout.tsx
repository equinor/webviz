import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { LayoutElement, Workbench } from "@framework/Workbench";
import {
    MANHATTAN_LENGTH,
    Point,
    Rect,
    Size,
    pointDifference,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
    rectContainsPoint,
    scaleRectIndividually,
} from "@framework/utils/geometry";

import { LayoutBox, LayoutBoxComponents, makeLayoutBoxes } from "./LayoutBox";
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
        let relativePointerPosition: Point = { x: 0, y: 0 };
        let pointerToElementDiff: Point = { x: 0, y: 0 };
        let dragging = false;
        let moduleInstanceId: string | null = null;
        setLayout(props.workbench.getLayout());
        let layout: LayoutElement[] = props.workbench.getLayout();
        let layoutBox = makeLayoutBoxes(layout);
        let previewLayoutBox: LayoutBox | null = null;
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
            layoutBox = makeLayoutBoxes(layout);
            previewLayoutBox = null;
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
                    relativePointerPosition = pointRelativeToDomRect(pointerDownPoint, rect);
                    document.body.classList.add("select-none");
                    dragging = true;
                    pointerToElementDiff = pointDifference(pointerDownPoint, pointerDownElementPosition);
                }
            } else {
                if (!moduleInstanceId || !pointerDownPoint) {
                    return;
                }
                const rect = ref.current.getBoundingClientRect();
                setPosition(pointDifference(pointDifference(pointerEventToPoint(e), rect), pointerToElementDiff));
                relativePointerPosition = pointDifference(pointerEventToPoint(e), rect);
                const layoutBoxContainingPoint = layoutBox.findBoxContainingPoint(relativePointerPosition, size);

                if (layoutBox) {
                    const preview = layoutBox.previewLayout(relativePointerPosition, size, moduleInstanceId);
                    if (preview) {
                        intermediateLayout = preview.toLayout();
                        setLayout(intermediateLayout);
                    }
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
    }, [size]);
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
