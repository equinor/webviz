import React from "react";

import { isEqual } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";

const COLLAPSE_EXPAND_THRESHOLD_EPSILON = 1e-5;
const COLLAPSE_THRESHOLD_PX = 50;
const EXPAND_THRESHOLD_PX = 100;

function pxToPercent(px: number, totalSizePx: number): number {
    return (px / totalSizePx) * 100;
}

export type ResizablePanelsProps = {
    id: string;
    direction: "horizontal" | "vertical";
    children: React.ReactNode[];
    minSizes?: number[];
    collapsedSizes?: number[];
    sizesInPercent?: number[];
    onSizesChange?: (sizesInPercent: number[]) => void;
    onCollapsedChange?: (collapsedStates: boolean[]) => void;
    visible?: boolean[];
};

/**
 * This component renders a set of resizable panels, either horizontally or vertically.
 *
 * It provides drag handles between the panels that can be used to resize them. And also the ability
 * to collapse panels by dragging them below a certain threshold.
 *
 * - The internal sizes are updated continuously as the user drags the resize handles, but the
 *   onSizesChange callback is only fired when the user releases the mouse button.
 * - The collapsed states are updated continuously as the user drags the resize handles, and the
 *   onCollapsedChange callback is fired whenever a panel's collapsed state changes.
 * - Thereby the content of a collapsed panel can be updated immediately when the panel is collapsed,
 *   and not based on the actual size change which may happen later.
 */
export function ResizablePanels(props: ResizablePanelsProps) {
    const { onSizesChange, onCollapsedChange } = props;

    if (props.minSizes && props.minSizes.length !== props.children.length) {
        throw new Error("minSizes must have the same length as children");
    }

    if (props.visible && props.visible.length !== props.children.length) {
        throw new Error("visible must have the same length as children");
    }

    function getInitialSizes() {
        if (props.sizesInPercent) {
            return props.sizesInPercent;
        }
        const loadedSizes = loadConfigurationFromLocalStorage(props.id);
        if (loadedSizes) {
            return loadedSizes;
        }
        return Array(props.children.length).fill(100.0 / props.children.length);
    }

    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [draggingIndex, setDraggingIndex] = React.useState<number>(0);
    const [sizes, setSizes] = React.useState<number[]>(getInitialSizes);
    const [prevSizes, setPrevSizes] = React.useState<number[]>(sizes);
    const [prevNumChildren, setPrevNumChildren] = React.useState<number>(props.children.length);

    const resizablePanelsRef = React.useRef<HTMLDivElement | null>(null);
    const individualPanelRefs = React.useRef<(HTMLDivElement | null)[]>([]);
    const prevCollapsedStatesRef = React.useRef<boolean[]>([]);

    const { width: totalWidth, height: totalHeight } = useElementSize(resizablePanelsRef);

    if (props.sizesInPercent && !isEqual(props.sizesInPercent, prevSizes)) {
        setSizes(props.sizesInPercent);
        setPrevSizes(props.sizesInPercent);
    }

    if (props.children.length !== prevNumChildren) {
        individualPanelRefs.current = individualPanelRefs.current.slice(0, props.children.length);
        setPrevNumChildren(props.children.length);
    }

    React.useEffect(() => {
        let changedSizes: number[] = [];
        let dragging = false;
        let index = 0;

        function handlePointerDown(e: PointerEvent) {
            if (e.target instanceof HTMLElement && e.target.dataset.handle) {
                index = parseInt(e.target.dataset.handle, 10);
                setDraggingIndex(index);
                dragging = true;
                setIsDragging(true);
                e.preventDefault();

                addEventListeners();
            }
        }

        function handlePointerMove(e: PointerEvent) {
            if (!dragging) {
                return;
            }

            // Prevent any scrolling on touch devices
            e.preventDefault();
            e.stopPropagation();

            let totalSize = 0;
            const containerBoundingRect = resizablePanelsRef.current?.getBoundingClientRect();
            if (props.direction === "horizontal") {
                totalSize = containerBoundingRect?.width || 0;
            } else if (props.direction === "vertical") {
                totalSize = containerBoundingRect?.height || 0;
            }

            const firstElementBoundingRect = individualPanelRefs.current[index]?.getBoundingClientRect();
            const secondElementBoundingRect = individualPanelRefs.current[index + 1]?.getBoundingClientRect();

            if (containerBoundingRect && firstElementBoundingRect && secondElementBoundingRect) {
                const cursorWithinBounds: Vec2 = {
                    x: Math.max(
                        containerBoundingRect.left,
                        Math.min(e.clientX, containerBoundingRect.left + containerBoundingRect.width),
                    ),
                    y: Math.max(
                        containerBoundingRect.top,
                        Math.min(e.clientY, containerBoundingRect.top + containerBoundingRect.height),
                    ),
                };

                setSizes((prev) => {
                    const totalSizePx = props.direction === "horizontal" ? totalWidth : totalHeight;
                    const collapseThresholdInPercent = pxToPercent(COLLAPSE_THRESHOLD_PX, totalSizePx);
                    const expandThresholdInPercent = pxToPercent(EXPAND_THRESHOLD_PX, totalSizePx);

                    // Initialize collapsed states from current sizes if not set yet
                    if (prevCollapsedStatesRef.current.length !== prev.length) {
                        prevCollapsedStatesRef.current = prev.map(
                            (size) => size <= collapseThresholdInPercent + COLLAPSE_EXPAND_THRESHOLD_EPSILON,
                        );
                    }

                    const newSizes = prev.map((size, i) => {
                        if (i === index) {
                            let newSize = cursorWithinBounds.x - firstElementBoundingRect.left;
                            if (props.direction === "vertical") {
                                newSize = cursorWithinBounds.y - firstElementBoundingRect.top;
                            }
                            return Math.max((newSize / totalSize) * 100, 0);
                        }
                        if (i === index + 1) {
                            let newSize =
                                secondElementBoundingRect.right -
                                Math.max(firstElementBoundingRect.left, cursorWithinBounds.x);
                            if (props.direction === "vertical") {
                                newSize =
                                    secondElementBoundingRect.bottom -
                                    Math.max(firstElementBoundingRect.top, cursorWithinBounds.y);
                            }
                            return Math.max((newSize / totalSize) * 100, 0);
                        }
                        return size;
                    }) as number[];

                    const adjustedSizes: number[] = [...newSizes];

                    for (let i = 0; i < newSizes.length; i++) {
                        // Use minSizes if provided, otherwise fall back to collapsedSizes, then 0
                        const effectiveMinSize = props.minSizes?.at(i) ?? props.collapsedSizes?.at(i) ?? 0;
                        const minSizeInPercent = (effectiveMinSize / totalSize) * 100;
                        const collapsedSizeInPercent = ((props.collapsedSizes?.at(i) ?? 0) / totalSize) * 100;
                        const isCurrentlyCollapsed = prevCollapsedStatesRef.current[i] ?? false;

                        // Helper to set panel size and redistribute the difference to adjacent panel
                        function adjustToTargetSize(targetSizeInPercent: number) {
                            const sizeDelta = newSizes[i] - targetSizeInPercent;
                            adjustedSizes[i] = targetSizeInPercent;
                            if (i < newSizes.length - 1) {
                                adjustedSizes[i + 1] = adjustedSizes[i + 1] + sizeDelta;
                            } else {
                                adjustedSizes[i - 1] = adjustedSizes[i - 1] + sizeDelta;
                            }
                        }

                        if (props.visible?.at(i) === false) {
                            // Panel is hidden
                            adjustToTargetSize(0);
                        } else if (isCurrentlyCollapsed && effectiveMinSize > 0) {
                            // Panel is currently collapsed - use expand threshold (hysteresis)
                            if (newSizes[i] < expandThresholdInPercent) {
                                // Stay collapsed
                                adjustToTargetSize(collapsedSizeInPercent);
                            } else if (newSizes[i] < minSizeInPercent) {
                                // Expanding - snap to minSize
                                adjustToTargetSize(minSizeInPercent);
                            }
                            // else: size >= minSize, use actual size (no adjustment needed)
                        } else if (newSizes[i] < collapseThresholdInPercent) {
                            // Panel is expanded and being dragged below collapse threshold
                            adjustToTargetSize(collapsedSizeInPercent);
                        } else if (newSizes[i] < minSizeInPercent) {
                            // Panel is expanded but below minSize - snap to minSize
                            adjustToTargetSize(minSizeInPercent);
                        }
                    }

                    changedSizes = adjustedSizes;

                    // Determine current collapsed states and fire callback if changed
                    // Use the appropriate threshold based on current collapsed state (hysteresis)
                    const currentCollapsedStates = newSizes.map((size, i) => {
                        const wasCollapsed = prevCollapsedStatesRef.current[i] ?? false;
                        if (wasCollapsed) {
                            // Use expand threshold to determine if still collapsed
                            return size < expandThresholdInPercent + COLLAPSE_EXPAND_THRESHOLD_EPSILON;
                        }
                        // Use collapse threshold to determine if now collapsed
                        return size < collapseThresholdInPercent + COLLAPSE_EXPAND_THRESHOLD_EPSILON;
                    });

                    const prevCollapsedStates = prevCollapsedStatesRef.current;
                    if (!isEqual(currentCollapsedStates, prevCollapsedStates)) {
                        prevCollapsedStatesRef.current = currentCollapsedStates;
                        if (onCollapsedChange) {
                            // Defer callback to avoid updating another component during state update
                            queueMicrotask(() => onCollapsedChange(currentCollapsedStates));
                        }
                    }

                    return adjustedSizes;
                });
            }
        }

        function handlePointerUp() {
            if (!dragging) {
                return;
            }
            if (changedSizes) {
                storeConfigurationInLocalStorage(props.id, changedSizes);
            }
            dragging = false;
            setIsDragging(false);
            if (onSizesChange) {
                onSizesChange(changedSizes);
            }
            removeEventListeners();
        }

        function addEventListeners() {
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);
            window.addEventListener("blur-sm", handlePointerUp);
        }

        function removeEventListeners() {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("blur-sm", handlePointerUp);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            removeEventListeners();
        };
    }, [
        props.direction,
        props.id,
        props.minSizes,
        props.collapsedSizes,
        props.visible,
        totalWidth,
        totalHeight,
        onSizesChange,
        onCollapsedChange,
    ]);

    function maybeMakeDragBar(index: number) {
        if (index < props.children.length - 1) {
            return (
                <DragBar direction={props.direction} index={index} isDragging={isDragging && draggingIndex === index} />
            );
        }
        return null;
    }

    function makeStyle(index: number): React.CSSProperties {
        const style: React.CSSProperties = {};
        const totalSizePx = props.direction === "horizontal" ? totalWidth : totalHeight;
        const collapseThresholdInPercent = pxToPercent(COLLAPSE_THRESHOLD_PX, totalSizePx);

        // Use minSizes if provided, otherwise fall back to collapsedSizes
        const effectiveMinSize = props.minSizes?.at(index) ?? props.collapsedSizes?.at(index) ?? 0;
        let subtractHandleSize = 1;
        if (index === 0 || index === props.children.length - 1) {
            subtractHandleSize = 0.5;
        }
        // Round to 6 decimal places to prevent floating-point precision issues
        // that can cause 1px flickering when useElementSize observes the rendered size
        const roundedSize = Math.round(sizes[index] * 1000000) / 1000000;

        if (props.direction === "horizontal") {
            style.width = `calc(${roundedSize}% - ${subtractHandleSize}px)`;
            style.minWidth = undefined;
            if (props.visible?.at(index) !== false && sizes[index] >= collapseThresholdInPercent) {
                style.minWidth = Math.max(effectiveMinSize - subtractHandleSize, subtractHandleSize);
            }

            if (sizes[index] <= collapseThresholdInPercent + COLLAPSE_EXPAND_THRESHOLD_EPSILON) {
                const collapsedSize = props.collapsedSizes?.at(index) ?? 0;
                style.maxWidth = collapsedSize;
                style.minWidth = collapsedSize;
            } else if (props.visible?.at(index) === false) {
                style.maxWidth = 0;
            } else {
                style.maxWidth = undefined;
            }
        } else {
            style.height = `calc(${roundedSize}% - ${subtractHandleSize}px)`;
            style.minHeight = undefined;
            if (props.visible?.at(index) !== false && sizes[index] >= collapseThresholdInPercent) {
                style.minHeight = Math.max(effectiveMinSize - subtractHandleSize, subtractHandleSize);
            }

            if (sizes[index] <= collapseThresholdInPercent + COLLAPSE_EXPAND_THRESHOLD_EPSILON) {
                const collapsedSize = props.collapsedSizes?.at(index) ?? 0;
                style.maxHeight = collapsedSize;
                style.minHeight = collapsedSize;
            } else if (props.visible?.at(index) === false) {
                style.maxHeight = 0;
            } else {
                style.maxHeight = undefined;
            }
        }

        return style;
    }

    return (
        <div
            className={resolveClassNames("flex w-full h-full relative align-stretch", {
                "flex-row": props.direction === "horizontal",
                "flex-col": props.direction === "vertical",
            })}
            ref={resizablePanelsRef}
        >
            <div
                className={resolveClassNames("absolute z-50 bg-transparent", {
                    "cursor-ew-resize": props.direction === "horizontal",
                    "cursor-ns-resize": props.direction === "vertical",
                    hidden: !isDragging,
                })}
                style={{
                    width: totalWidth,
                    height: totalHeight,
                }}
            />
            {props.children.map((el: React.ReactNode, index: number) => (
                <React.Fragment key={`resizable-panel-${index}`}>
                    <div
                        className="grow overflow-hidden"
                        ref={(element) => (individualPanelRefs.current[index] = element)}
                        style={makeStyle(index)}
                    >
                        {el}
                    </div>
                    {maybeMakeDragBar(index)}
                </React.Fragment>
            ))}
        </div>
    );
}

function loadConfigurationFromLocalStorage(id: string): number[] | undefined {
    const configuration = localStorage.getItem(`resizable-panels-${id}`);
    if (configuration) {
        return JSON.parse(configuration);
    }
    return undefined;
}

function storeConfigurationInLocalStorage(id: string, sizes: number[]) {
    localStorage.setItem(`resizable-panels-${id}`, JSON.stringify(sizes));
}

type DragBarProps = {
    direction: "horizontal" | "vertical";
    index: number;
    isDragging: boolean;
};

function DragBar(props: DragBarProps) {
    return (
        <div
            className={resolveClassNames(
                "relative z-40 transition-colors ease-in-out duration-100 hover:bg-sky-500 outline-sky-500 hover:outline-2 touch-none",
                {
                    "bg-sky-500 outline-2 outline-sky-500": props.isDragging,
                    "border-transparent bg-gray-300": !props.isDragging,
                    "cursor-ew-resize w-px": props.direction === "horizontal",
                    "cursor-ns-resize h-px": props.direction === "vertical",
                },
            )}
        >
            <div
                data-handle={props.index}
                className={resolveClassNames("z-40 touch-none absolute bg-transparent", {
                    "cursor-ew-resize w-1 -left-0.25 top-0 h-full": props.direction === "horizontal",
                    "cursor-ns-resize h-2 left-0 -top-0.25 w-full": props.direction === "vertical",
                })}
            />
        </div>
    );
}
