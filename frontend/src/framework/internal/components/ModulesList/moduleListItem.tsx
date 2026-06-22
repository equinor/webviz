import React from "react";

import { Help } from "@mui/icons-material";

import { GuiEvent, type GuiMessageBroker } from "@framework/GuiMessageBroker";
import { ModuleDevState } from "@framework/Module";
import type { DrawPreviewFunc } from "@framework/Preview";
import { Button } from "@lib/newComponents/Button";
import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, pointRelativeToDomRect, type Size2D } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";
import { vec2FromPointerEvent, point2Distance, subtractVec2 } from "@lib/utils/vec2";

import { DevStateIcon, ICON_SIZE_PX, PersistenceIcon } from "./moduleIcons";
import { PreviewImage } from "./previewImage";

export type ModulesListItemProps = {
    name: string;
    devState: ModuleDevState;
    displayName: string;
    description: string | null;
    isSerializable: boolean;
    drawPreviewFunc: DrawPreviewFunc | null;
    guiMessageBroker: GuiMessageBroker;
    onShowDetails: (moduleName: string) => void;
    onHover: (moduleName: string, ref: React.RefObject<HTMLDivElement>) => void;
    onDraggingStart: () => void;
};

export function ModulesListItem(props: ModulesListItemProps): React.ReactNode {
    const { onDraggingStart } = props;
    const ref = React.useRef<HTMLDivElement>(null);
    const [isDragged, setIsDragged] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [dragSize, setDragSize] = React.useState<Size2D>({ width: 0, height: 0 });

    React.useEffect(
        function pointerEventsEffect() {
            const refCurrent = ref.current;
            let pointerDownPoint: Vec2 | null = null;
            let dragging = false;
            let pointerDownElementPosition: Vec2 | null = null;
            let pointerToElementDiff: Vec2 = { x: 0, y: 0 };

            const handlePointerDown = (e: PointerEvent) => {
                if (ref.current) {
                    document.body.classList.add("touch-none");
                    const point = vec2FromPointerEvent(e);
                    const rect = ref.current.getBoundingClientRect();
                    pointerDownElementPosition = subtractVec2(point, pointRelativeToDomRect(point, rect));
                    props.guiMessageBroker.publishEvent(GuiEvent.NewModulePointerDown, {
                        moduleName: props.name,
                        elementPosition: subtractVec2(point, pointRelativeToDomRect(point, rect)),
                        elementSize: { width: rect.width, height: rect.height },
                        pointerPosition: point,
                    });
                    pointerDownPoint = point;
                    addDraggingEventListeners();
                }
            };

            const handlePointerUp = () => {
                if (!pointerDownPoint) {
                    return;
                }
                pointerDownPoint = null;
                dragging = false;
                setIsDragged(false);
                document.body.classList.remove("touch-none");
                pointerDownElementPosition = null;

                removeDraggingEventListeners();
            };

            const handlePointerMove = (e: PointerEvent) => {
                if (!pointerDownPoint) {
                    return;
                }

                if (
                    !dragging &&
                    point2Distance(vec2FromPointerEvent(e), pointerDownPoint) > MANHATTAN_LENGTH &&
                    pointerDownElementPosition
                ) {
                    dragging = true;
                    setIsDragged(true);
                    onDraggingStart();
                    if (ref.current) {
                        const rect = ref.current.getBoundingClientRect();
                        setDragSize({ width: rect.width, height: rect.height });
                    }
                    pointerToElementDiff = subtractVec2(pointerDownPoint, pointerDownElementPosition);
                    return;
                }

                if (dragging) {
                    setDragPosition(subtractVec2(vec2FromPointerEvent(e), pointerToElementDiff));
                }
            };

            function addDraggingEventListeners() {
                document.addEventListener("pointerup", handlePointerUp);
                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointercancel", handlePointerUp);
                document.addEventListener("blur-sm", handlePointerUp);
            }

            function removeDraggingEventListeners() {
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointercancel", handlePointerUp);
                document.removeEventListener("blur-sm", handlePointerUp);
            }

            if (ref.current) {
                ref.current.addEventListener("pointerdown", handlePointerDown);
            }

            return () => {
                if (refCurrent) {
                    refCurrent.removeEventListener("pointerdown", handlePointerDown);
                }
                removeDraggingEventListeners();
            };
        },
        [props.guiMessageBroker, props.name, onDraggingStart],
    );

    function handleShowDetails() {
        props.onShowDetails(props.name);
    }

    function handleHover() {
        props.onHover(props.name, ref);
    }

    function makeItem() {
        return (
            <div
                ref={isDragged ? undefined : ref}
                className={resolveClassNames(
                    "hover:bg-accent text-body-md flex h-12 w-full touch-none flex-col select-none",
                    {
                        "cursor-grab": !isDragged,
                        "cursor-grabbing": isDragged,
                    },
                )}
                style={makeStyle(isDragged, dragSize, dragPosition)}
                onMouseOver={handleHover}
            >
                <div className="px-xs gap-x-xs text-body-sm flex h-full items-center">
                    <div className="border-neutral-subtle bg-canvas h-10 w-10 min-w-10 shrink-0 overflow-hidden border">
                        <PreviewImage size={40} drawPreviewFunc={props.drawPreviewFunc} />
                    </div>
                    <span className="grow overflow-hidden text-ellipsis whitespace-nowrap">{props.displayName}</span>
                    <span
                        className={resolveClassNames({
                            "text-warning-subtle": props.devState === ModuleDevState.DEV,
                            "text-danger-subtle": props.devState === ModuleDevState.DEPRECATED,
                        })}
                    >
                        <DevStateIcon devState={props.devState} />
                    </span>
                    <span className="text-neutral-subtle">
                        <PersistenceIcon isSerializable={props.isSerializable} />
                    </span>

                    <Button variant="ghost" tone="accent" size="small" iconOnly onClick={handleShowDetails}>
                        <Help style={{ fontSize: ICON_SIZE_PX }} />
                    </Button>
                </div>
            </div>
        );
    }

    if (isDragged) {
        return (
            <>
                <div ref={ref} className="bg-accent-canvas h-12 w-full" />
                {createPortal(makeItem())}
            </>
        );
    }
    return makeItem();
}

const makeStyle = (isDragged: boolean, dragSize: Size2D, dragPosition: Vec2): React.CSSProperties => {
    if (isDragged) {
        return {
            width: dragSize.width,
            height: dragSize.height,
            left: dragPosition.x,
            top: dragPosition.y,
            zIndex: 50,
            opacity: 0.5,
            position: "absolute",
        };
    }
    return {
        zIndex: 0,
        opacity: 1,
    };
};
