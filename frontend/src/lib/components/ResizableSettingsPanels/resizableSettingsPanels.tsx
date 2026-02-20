import React from "react";

import { isEqual } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { loadConfigurationFromLocalStorage, storeConfigurationInLocalStorage } from "./private-utils/localStorage";
import { pxToPercent } from "./private-utils/sizeUtils";

const COLLAPSE_EXPAND_THRESHOLD_EPSILON = 1e-3;
const COLLAPSE_EXPAND_THRESHOLD_PX = 50;

export type ResizableSettingsPanelsProps = {
    id: string;
    children: React.ReactNode[];
    minSizes?: number[];
    sizesInPercent?: number[];
    collapsedSizes?: number[];
    collapsedStates?: (boolean | null)[];
    visible?: boolean[];
    onSizesChange?: (sizesInPercent: number[]) => void;
    onCollapsedChange?: (collapsedStates: boolean[]) => void;
};

function assertPropsConsistency(props: ResizableSettingsPanelsProps) {
    const panelCount = props.children.length;

    const expectedNumberOfSettingsPanels = panelCount - 1;

    if (props.children.length < 1 || props.children.length > 3) {
        throw new Error("ResizableSettingsPanels requires between 1 and 3 children (left panel, content, right panel)");
    }

    if (props.minSizes && props.minSizes.length !== expectedNumberOfSettingsPanels) {
        throw new Error(
            `minSizes length (${props.minSizes.length}) does not match number of settings panels (${expectedNumberOfSettingsPanels})`,
        );
    }
    if (props.collapsedSizes && props.collapsedSizes.length !== expectedNumberOfSettingsPanels) {
        throw new Error(
            `collapsedSizes length (${props.collapsedSizes.length}) does not match number of settings panels (${expectedNumberOfSettingsPanels})`,
        );
    }
    if (props.sizesInPercent && props.sizesInPercent.length !== expectedNumberOfSettingsPanels) {
        throw new Error(
            `sizesInPercent length (${props.sizesInPercent.length}) does not match number of settings panels (${expectedNumberOfSettingsPanels})`,
        );
    }
    if (props.collapsedStates && props.collapsedStates.length !== expectedNumberOfSettingsPanels) {
        throw new Error(
            `collapsedStates length (${props.collapsedStates.length}) does not match number of settings panels (${expectedNumberOfSettingsPanels})`,
        );
    }
    if (props.visible && props.visible.length !== expectedNumberOfSettingsPanels) {
        throw new Error(
            `visible length (${props.visible.length}) does not match number of settings panels (${expectedNumberOfSettingsPanels})`,
        );
    }
}

/**
 * This component renders a set of resizable settings panels, with a content area between them.
 *
 * The settings panels can be collapsed or expanded, and their sizes can be adjusted by the user.
 * The content area automatically adjusts its size based on the sizes of the settings panels,
 * as it is the only panel with flex-grow. This avoids the issue of other panels growing when
 * a panel is collapsed.
 *
 * The children prop should contain the panels in the following order:
 * - Left settings panel (optional)
 * - Content area (required)
 * - Right settings panel (optional)
 *
 * 1 panel layout: [Content]
 * 2 panel layout: [Left Settings Panel] [Content]
 * 3 panel layout: [Left Settings Panel] [Content] [Right Settings Panel]
 *
 * If sizesInPercent, collapsedSizes, minSizes, collapsedStates, etc are provided, they must match the number
 * of settings panels (i.e. children.length - 1).
 */
export function ResizableSettingsPanels(props: ResizableSettingsPanelsProps) {
    const { onSizesChange, onCollapsedChange } = props;

    assertPropsConsistency(props);

    const numSettingsPanels = props.children.length - 1;
    const contentIndex = props.children.length > 1 ? 1 : 0;

    function getInitialSizes() {
        if (props.sizesInPercent) {
            return props.sizesInPercent;
        }
        const loadedSizes = loadConfigurationFromLocalStorage(props.id);
        if (loadedSizes && loadedSizes.length === numSettingsPanels) {
            return loadedSizes;
        }
        if (numSettingsPanels === 0) {
            return [];
        }
        return Array(numSettingsPanels).fill(100.0 / (numSettingsPanels + 1));
    }

    const [isDragging, setIsDragging] = React.useState(false);
    const [draggingIndex, setDraggingIndex] = React.useState(0);
    const [sizes, setSizes] = React.useState<number[]>(getInitialSizes);
    const [prevSizes, setPrevSizes] = React.useState<number[]>(sizes);
    const [prevNumChildren, setPrevNumChildren] = React.useState(props.children.length);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const { width: totalWidth } = useElementSize(containerRef);

    const collapsedStatesRef = React.useRef(props.collapsedStates);
    collapsedStatesRef.current = props.collapsedStates;

    const validCollapsedSizes = React.useMemo<number[]>(
        function calculateValidCollapsedSizes() {
            return props.collapsedSizes ?? Array(numSettingsPanels).fill(0);
        },
        [props.collapsedSizes, numSettingsPanels],
    );

    // Sync with controlled sizesInPercent prop
    if (props.sizesInPercent && !isEqual(props.sizesInPercent, prevSizes)) {
        setSizes(props.sizesInPercent);
        setPrevSizes(props.sizesInPercent);
    }

    if (props.children.length !== prevNumChildren) {
        setPrevNumChildren(props.children.length);
    }

    // Drag handling of dragBars
    React.useEffect(() => {
        let changedSizes: number[] = [];
        let dragging = false;
        let index = 0;

        function handlePointerDown(e: PointerEvent) {
            if (e.target instanceof HTMLElement && e.target.dataset.settingsHandle) {
                index = parseInt(e.target.dataset.settingsHandle, 10);
                setDraggingIndex(index);
                dragging = true;
                setIsDragging(true);
                e.preventDefault();
                addEventListeners();
            }
        }

        function handlePointerMove(e: PointerEvent) {
            if (!dragging) return;

            e.preventDefault();
            e.stopPropagation();

            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            const totalWidthPx = containerRect.width;
            if (totalWidthPx === 0) return;

            // Clamp cursor within container bounds
            const cursorX = Math.max(containerRect.left, Math.min(e.clientX, containerRect.right));

            setSizes((prev) => {
                const epsilon = COLLAPSE_EXPAND_THRESHOLD_EPSILON;
                const collapseThresholdPercent = pxToPercent(COLLAPSE_EXPAND_THRESHOLD_PX, totalWidthPx, epsilon);
                const expandThresholdPercent = pxToPercent(
                    (validCollapsedSizes[index] ?? 0) + COLLAPSE_EXPAND_THRESHOLD_PX,
                    totalWidthPx,
                    epsilon,
                );

                // Compute raw new width based on cursor position
                // Left panel (index 0): width from container left edge to cursor
                // Right panel (index 1): width from cursor to container right edge
                const isRightPanel = index > 0;
                const settingsPanelWidthPx = Math.max(
                    isRightPanel ? containerRect.right - cursorX : cursorX - containerRect.left,
                    0,
                );
                const settingsPanelWidthPercent = (settingsPanelWidthPx / totalWidthPx) * 100;

                // Apply min/collapse thresholds for the dragged panel only
                const effectiveMinSize = props.minSizes?.at(index) ?? validCollapsedSizes[index] ?? 0;
                const minSizePercent = (effectiveMinSize / totalWidthPx) * 100;
                const collapsedSizePercent = ((validCollapsedSizes[index] ?? 0) / totalWidthPx) * 100;
                const isCurrentlyCollapsed = collapsedStatesRef.current?.[index] ?? false;

                // Adjust width based on thresholds and collapsed state
                let adjustedWidthPercent = settingsPanelWidthPercent;
                if (props.visible?.at(index) === false) {
                    adjustedWidthPercent = 0;
                } else if (isCurrentlyCollapsed && effectiveMinSize > 0) {
                    // Panel is currently collapsed — use expand threshold (hysteresis)
                    if (settingsPanelWidthPercent < expandThresholdPercent) {
                        adjustedWidthPercent = collapsedSizePercent;
                    } else if (settingsPanelWidthPercent < minSizePercent) {
                        adjustedWidthPercent = minSizePercent;
                    }
                } else if (settingsPanelWidthPercent < collapseThresholdPercent) {
                    // Panel is expanded and being dragged below collapse threshold
                    adjustedWidthPercent = collapsedSizePercent;
                } else if (settingsPanelWidthPercent < minSizePercent) {
                    // Panel is expanded but below minSize — snap to minSize
                    adjustedWidthPercent = minSizePercent;
                }

                const newSizes = [...prev];
                newSizes[index] = adjustedWidthPercent;
                changedSizes = newSizes;

                // Detect collapsed state change for the dragged panel
                const wasCollapsed = collapsedStatesRef.current?.[index] ?? false;
                const isNowCollapsed = wasCollapsed
                    ? settingsPanelWidthPercent < expandThresholdPercent
                    : settingsPanelWidthPercent < collapseThresholdPercent;

                if (isNowCollapsed !== wasCollapsed && onCollapsedChange) {
                    const newCollapsedStates = (collapsedStatesRef.current ?? []).map((s) => s ?? false);
                    if (newCollapsedStates.length <= index) {
                        const missingCollapsedStates = Array(index - newCollapsedStates.length + 1).fill(false);
                        newCollapsedStates.push(...missingCollapsedStates);
                    }
                    newCollapsedStates[index] = isNowCollapsed;
                    queueMicrotask(() => onCollapsedChange(newCollapsedStates));
                }

                return newSizes;
            });
        }

        function handlePointerUp() {
            if (!dragging) return;
            if (changedSizes.length > 0) {
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
            window.addEventListener("blur", handlePointerUp);
        }

        function removeEventListeners() {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("blur", handlePointerUp);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            removeEventListeners();
        };
    }, [props.id, props.minSizes, props.visible, totalWidth, validCollapsedSizes, onSizesChange, onCollapsedChange]);

    function makeSettingsPanelStyle(settingsPanelIndex: number): React.CSSProperties {
        const style: React.CSSProperties = {
            flexGrow: 0,
            flexShrink: 0,
            overflow: "hidden",
        };

        const isCollapsed = props.collapsedStates?.[settingsPanelIndex];
        const isVisible = props.visible?.at(settingsPanelIndex) !== false;

        if (!isVisible) {
            style.width = 0;
            style.maxWidth = 0;
            return style;
        }

        if (isCollapsed === true) {
            const collapsedSize = validCollapsedSizes[settingsPanelIndex] ?? 0;
            style.width = collapsedSize;
            style.minWidth = collapsedSize;
            style.maxWidth = collapsedSize;
            return style;
        }

        const sizePercent = sizes[settingsPanelIndex];
        const effectiveMinSize = props.minSizes?.at(settingsPanelIndex) ?? validCollapsedSizes[settingsPanelIndex] ?? 0;

        // For uncontrolled panels (collapsedStates is null/undefined), detect collapse from size
        if (isCollapsed === null || isCollapsed === undefined) {
            if (totalWidth > 0 && sizePercent < pxToPercent(COLLAPSE_EXPAND_THRESHOLD_PX, totalWidth)) {
                const collapsedSize = validCollapsedSizes[settingsPanelIndex] ?? 0;
                style.width = collapsedSize;
                style.minWidth = collapsedSize;
                style.maxWidth = collapsedSize;
                return style;
            }
        }

        style.width = `${sizePercent}%`;
        style.minWidth = effectiveMinSize;

        return style;
    }

    function maybeMakeDragBar(childIndex: number) {
        if (childIndex < props.children.length - 1) {
            return <SettingsDragBar index={childIndex} isDragging={isDragging && draggingIndex === childIndex} />;
        }
        return null;
    }

    return (
        <div className="flex flex-row w-full h-full relative" ref={containerRef}>
            <div
                className={resolveClassNames("absolute z-50 bg-transparent cursor-ew-resize", {
                    hidden: !isDragging,
                })}
                style={{
                    width: totalWidth,
                    height: "100%",
                }}
            />
            {props.children.map((el: React.ReactNode, childIndex: number) => {
                const isContent = childIndex === contentIndex;
                const settingsPanelIndex = childIndex < contentIndex ? childIndex : childIndex - 1;

                return (
                    <React.Fragment key={`resizable-settings-panel-element-${childIndex}`}>
                        <div
                            className={isContent ? "grow overflow-hidden" : "overflow-hidden"}
                            style={isContent ? undefined : makeSettingsPanelStyle(settingsPanelIndex)}
                        >
                            {el}
                        </div>
                        {maybeMakeDragBar(childIndex)}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

type SettingsDragBarProps = {
    index: number;
    isDragging: boolean;
};

function SettingsDragBar(props: SettingsDragBarProps) {
    return (
        <div
            className={resolveClassNames(
                "relative z-40 transition-colors ease-in-out duration-100 hover:bg-sky-500 outline-sky-500 hover:outline-2 touch-none cursor-ew-resize w-px",
                {
                    "bg-sky-500 outline-2 outline-sky-500": props.isDragging,
                    "border-transparent bg-gray-300": !props.isDragging,
                },
            )}
        >
            <div
                data-settings-handle={props.index}
                className="z-40 touch-none absolute bg-transparent cursor-ew-resize w-1 -left-0.25 top-0 h-full"
            />
        </div>
    );
}
