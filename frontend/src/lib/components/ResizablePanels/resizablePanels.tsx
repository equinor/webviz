import React from "react";

import { isEqual } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { Vec2 } from "@lib/utils/vec2";

const COLLAPSE_EXPAND_THRESHOLD_EPSILON = 1e-3;
const COLLAPSE_EXPAND_THRESHOLD_PX = 50;

function pxToPercent(px: number, totalSizePx: number, threshold = COLLAPSE_EXPAND_THRESHOLD_EPSILON): number {
    return (px / totalSizePx) * 100 + threshold;
}

/**
 * Adjusts a panel to a target size in percent, redistributing the difference to the adjacent panel.
 * Mutates the sizes array in place.
 */
function adjustPanelToSize(sizes: number[], index: number, targetSizeInPercent: number): void {
    const delta = sizes[index] - targetSizeInPercent;
    sizes[index] = targetSizeInPercent;
    if (index < sizes.length - 1) {
        sizes[index + 1] += delta;
    } else if (index > 0) {
        sizes[index - 1] += delta;
    }
}

export type ResizablePanelsProps = {
    id: string;
    direction: "horizontal" | "vertical";
    children: React.ReactNode[];
    minSizes?: number[];
    collapsedSizes?: number[];
    sizesInPercent?: number[];
    collapsedStates?: (boolean | null)[];
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

    if (props.collapsedSizes && props.collapsedSizes.length !== props.children.length) {
        throw new Error("collapsedSizes must have the same length as children");
    }

    if (props.collapsedStates && props.collapsedStates.length !== props.children.length) {
        throw new Error("collapsedStates must have the same length as children");
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

    const { width: totalWidth, height: totalHeight } = useElementSize(resizablePanelsRef);

    const collapsedStatesRef = React.useRef(props.collapsedStates);
    collapsedStatesRef.current = props.collapsedStates;
    const prevCollapsedStates = React.useRef<(boolean | null)[] | undefined>(props.collapsedStates);

    const hasCollapsedStatesChanged = !isEqual(prevCollapsedStates.current, props.collapsedStates);

    // Update prevSizes
    const hasSizesInPercentChanged = props.sizesInPercent && !isEqual(props.sizesInPercent, prevSizes);
    if (hasSizesInPercentChanged) {
        setPrevSizes(props.sizesInPercent!);
        if (!hasCollapsedStatesChanged) {
            setSizes(props.sizesInPercent!);
        }
    }

    if (hasCollapsedStatesChanged) {
        // Update sizes to reflect new collapsed states, giving freed/needed space to next panel.
        // When sizesInPercent also changed in this render, use the new prop values as the base
        // so the collapse adjustment operates on the most up-to-date sizes.
        const totalSizePx = props.direction === "horizontal" ? totalWidth : totalHeight;
        const newSizes = hasSizesInPercentChanged ? [...props.sizesInPercent!] : [...sizes];
        for (let i = 0; i < newSizes.length; i++) {
            const wasCollapsed = prevCollapsedStates.current?.[i] ?? false;
            const isNowCollapsed = props.collapsedStates?.[i] ?? false;
            if (wasCollapsed === isNowCollapsed) continue;

            if (isNowCollapsed) {
                // Collapsing: snap to collapsed size, freed space goes to next panel
                const collapsedPercent = ((props.collapsedSizes?.[i] ?? 0) / totalSizePx) * 100;
                adjustPanelToSize(newSizes, i, collapsedPercent);
            } else {
                // Expanding: snap to min size, take space from next panel
                const minSize = props.minSizes?.at(i) ?? props.collapsedSizes?.[i] ?? 0;
                const minSizePercent = (minSize / totalSizePx) * 100;
                adjustPanelToSize(newSizes, i, minSizePercent);
            }
        }
        setSizes(newSizes);
        prevCollapsedStates.current = props.collapsedStates;
    }

    const validCollapsedSizes = React.useMemo<number[]>(
        function calculateValidCollapsedSizes() {
            return props.collapsedSizes ?? Array(props.children.length).fill(0);
        },
        [props.collapsedSizes, props.children.length],
    );

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
            if (containerBoundingRect && firstElementBoundingRect) {
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
                    const collapseThresholdInPercent = pxToPercent(COLLAPSE_EXPAND_THRESHOLD_PX, totalSizePx);
                    const expandThresholdInPercentPerPanel = validCollapsedSizes.map((size) =>
                        pxToPercent(size + COLLAPSE_EXPAND_THRESHOLD_PX, totalSizePx),
                    );

                    // Compute only the first panel's size from the cursor position,
                    // then derive the second panel as the remainder of their combined
                    // previous size. This ensures the total of all sizes stays constant
                    // and prevents other panels from growing due to flex redistribution
                    // when CSS min/max constraints cause bounding rects to diverge from
                    // percentage-based sizes.
                    const newSizes = [...prev];
                    const combinedSize = prev[index] + prev[index + 1];
                    const newFirstPanelPx =
                        props.direction === "horizontal"
                            ? cursorWithinBounds.x - firstElementBoundingRect.left
                            : cursorWithinBounds.y - firstElementBoundingRect.top;
                    const newFirstPanelPercent = Math.max(
                        Math.min((newFirstPanelPx / totalSize) * 100, combinedSize),
                        0,
                    );
                    newSizes[index] = newFirstPanelPercent;
                    newSizes[index + 1] = combinedSize - newFirstPanelPercent;

                    const adjustedSizes: number[] = [...newSizes];

                    for (let i = 0; i < newSizes.length; i++) {
                        // Use minSizes if provided, otherwise fall back to collapsedSizes, then 0
                        const effectiveMinSize = props.minSizes?.at(i) ?? validCollapsedSizes[i];
                        const minSizeInPercent = (effectiveMinSize / totalSize) * 100;
                        const collapsedSizeInPercent = (validCollapsedSizes[i] / totalSize) * 100;
                        const isCurrentlyCollapsed = collapsedStatesRef.current?.[i] ?? false;

                        if (props.visible?.at(i) === false) {
                            // Panel is hidden
                            adjustPanelToSize(adjustedSizes, i, 0);
                        } else if (isCurrentlyCollapsed && effectiveMinSize > 0) {
                            // Panel is currently collapsed - use expand threshold (hysteresis)
                            if (newSizes[i] < expandThresholdInPercentPerPanel[i]) {
                                // Stay collapsed
                                adjustPanelToSize(adjustedSizes, i, collapsedSizeInPercent);
                            } else if (newSizes[i] < minSizeInPercent) {
                                // Expanding - snap to minSize
                                adjustPanelToSize(adjustedSizes, i, minSizeInPercent);
                            }
                            // else: size >= minSize, use actual size (no adjustment needed)
                        } else if (newSizes[i] < collapseThresholdInPercent) {
                            // Panel is expanded and being dragged below collapse threshold
                            adjustPanelToSize(adjustedSizes, i, collapsedSizeInPercent);
                        } else if (newSizes[i] < minSizeInPercent) {
                            // Panel is expanded but below minSize - snap to minSize
                            adjustPanelToSize(adjustedSizes, i, minSizeInPercent);
                        }
                    }

                    changedSizes = adjustedSizes;

                    // Determine current collapsed states and fire callback if changed
                    // Use the appropriate threshold based on current collapsed state (hysteresis)
                    const currentCollapsedStates = newSizes.map((size, i) => {
                        const wasCollapsed = collapsedStatesRef.current?.[i] ?? false;
                        if (wasCollapsed) {
                            // Use expand threshold to determine if still collapsed
                            return size < expandThresholdInPercentPerPanel[i];
                        }
                        // Use collapse threshold to determine if now collapsed
                        return size < collapseThresholdInPercent;
                    });

                    // Compare against the collapsedStates prop - fire callback when detected state differs
                    const propCollapsedStates = (collapsedStatesRef.current ?? []).map((s) => s ?? false);
                    if (!isEqual(currentCollapsedStates, propCollapsedStates)) {
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
        props.visible,
        totalWidth,
        totalHeight,
        validCollapsedSizes,
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

        // Use the collapsedStates prop as the source of truth for collapsed state
        const isCollapsed = props.collapsedStates?.[index];

        // Force collapsed size if panel is hidden or stated as collapsed.
        // Use explicit width + flex: 0 0 auto to completely remove from flex redistribution.
        if (props.visible?.at(index) === false || isCollapsed === true) {
            const collapsedSize = validCollapsedSizes[index] ?? 0;
            style.flexGrow = 0;
            style.flexShrink = 0;
            if (props.direction === "horizontal") {
                style.width = collapsedSize;
                style.maxWidth = collapsedSize;
                style.minWidth = collapsedSize;
            } else {
                style.height = collapsedSize;
                style.maxHeight = collapsedSize;
                style.minHeight = collapsedSize;
            }
            return style;
        }

        let subtractHandleSize = 1;
        if (index === 0 || index === props.children.length - 1) {
            subtractHandleSize = 0.5;
        }
        // Round to 6 decimal places to prevent floating-point precision issues
        // that can cause 1px flickering when useElementSize observes the rendered size
        const roundedSize = Math.round(sizes[index] * 1000000) / 1000000;

        // Use minSizes if provided, otherwise fall back to collapsedSizes
        const effectiveMinSize = props.minSizes?.at(index) ?? validCollapsedSizes[index];
        const totalSizePx = props.direction === "horizontal" ? totalWidth : totalHeight;
        const toggleVisibilityValue = pxToPercent(COLLAPSE_EXPAND_THRESHOLD_PX, totalSizePx);

        // Panels with a min constraint are rigid (don't grow/shrink via flex).
        // Panels without a min constraint (typically the content panel) are flexible
        // and absorb any remaining space or overflow from the flex layout.
        if (effectiveMinSize > 0) {
            style.flexGrow = 0;
            style.flexShrink = 0;
        } else {
            style.flexGrow = 1;
            style.flexShrink = 1;
        }

        if (props.direction === "horizontal") {
            style.width = `calc(${roundedSize}% - ${subtractHandleSize}px)`;
            style.minWidth = undefined;
            if (sizes[index] >= toggleVisibilityValue) {
                style.minWidth = Math.max(effectiveMinSize - subtractHandleSize, subtractHandleSize);
            }
            if (sizes[index] < toggleVisibilityValue && isCollapsed === false) {
                style.minWidth = effectiveMinSize;
            }
            if (sizes[index] < toggleVisibilityValue) {
                style.maxWidth = 0;
            }
        } else {
            style.height = `calc(${roundedSize}% - ${subtractHandleSize}px)`;
            style.minHeight = undefined;
            if (sizes[index] >= toggleVisibilityValue) {
                style.minHeight = Math.max(effectiveMinSize - subtractHandleSize, subtractHandleSize);
            }
            if (sizes[index] < toggleVisibilityValue && isCollapsed === false) {
                style.minHeight = effectiveMinSize;
            }
            if (sizes[index] < toggleVisibilityValue) {
                style.maxHeight = 0;
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
