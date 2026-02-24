import React from "react";

import { isEqual } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

const COLLAPSE_EXPAND_THRESHOLD_PX = 50;

// Define type for settings panels
type SettingsPanel = "leftSettingsPanel" | "rightSettingsPanel";

export type ResizablePanels = {
    [K in SettingsPanel]?: React.ReactNode;
} & {
    content: React.ReactNode;
};

export type SettingsPanelsWidth = {
    [K in SettingsPanel]?: number;
};

export type SettingsPanelsCollapsedState = {
    [K in SettingsPanel]?: boolean | null;
};

export type SettingsPanelsVisibleState = {
    [K in SettingsPanel]?: boolean;
};

export type ResizableSettingsPanelsProps = {
    children: ResizablePanels;
    minWidths?: SettingsPanelsWidth;
    widthsInPercent?: SettingsPanelsWidth;
    collapsedWidths?: SettingsPanelsWidth;
    collapsedStates?: SettingsPanelsCollapsedState;
    visible?: SettingsPanelsVisibleState;
    onWidthsChange?: (widths: SettingsPanelsWidth) => void;
    onCollapsedChange?: (states: SettingsPanelsCollapsedState) => void;
};

/**
 * Assert consistency of props — if a side panel is provided, and the width and collapse state props are provided,
 * the relevant entries for that panel must be defined.
 */
function assertPropsConsistency(props: ResizableSettingsPanelsProps) {
    const sidePanels = (["leftSettingsPanel", "rightSettingsPanel"] as const).filter(
        (panel) => props.children[panel] !== undefined,
    );

    for (const panel of sidePanels) {
        if (props.minWidths !== undefined && props.minWidths[panel] === undefined) {
            throw new Error(
                `When minWidths is provided, minWidths.${panel} must be defined when children.${panel} is defined`,
            );
        }
        if (props.widthsInPercent !== undefined && props.widthsInPercent[panel] === undefined) {
            throw new Error(
                `When widthsInPercent is provided, widthsInPercent.${panel} must be defined when children.${panel} is defined`,
            );
        }
        if (props.collapsedWidths !== undefined && props.collapsedWidths[panel] === undefined) {
            throw new Error(
                `When collapsedWidths is provided, collapsedWidths.${panel} must be defined when children.${panel} is defined`,
            );
        }
        if (props.collapsedStates !== undefined && props.collapsedStates[panel] === undefined) {
            throw new Error(
                `When collapsedStates is provided, collapsedStates.${panel} must be defined when children.${panel} is defined`,
            );
        }
        if (props.visible !== undefined && props.visible[panel] === undefined) {
            throw new Error(
                `When visible is provided, visible.${panel} must be defined when children.${panel} is defined`,
            );
        }
    }
}

/**
 * This component renders a set of resizable settings panels, with a content area between them.
 *
 * The settings panels can be collapsed or expanded, and their widths can be adjusted by the user.
 * The content area automatically adjusts its width based on the widths of the settings panels,
 * as it is the only panel with flex-grow. This avoids the issue of other panels growing when
 * a panel is collapsed.
 *
 * The children prop should contain the panels to render, with the following structure:
 * - leftSettingsPanel (optional)
 * - content (required)
 * - rightSettingsPanel (optional)
 *
 * 1 panel layout: [Content]
 * 2 panel layout: [Left Settings Panel] [Content] or [Content] [Right Settings Panel]
 * 3 panel layout: [Left Settings Panel] [Content] [Right Settings Panel]
 *
 * Sizing and collapsed-state props use the same { leftSettingsPanel?, rightSettingsPanel? } shape —
 * if a prop is provided, the value for the relevant panel(s) must be provided.
 */
export function ResizableSettingsPanels(props: ResizableSettingsPanelsProps): React.ReactNode {
    const { onWidthsChange, onCollapsedChange } = props;

    // Validate consistency of props
    assertPropsConsistency(props);

    function getInitialSettingPanelWidths(): SettingsPanelsWidth {
        const defaultLeft = props.minWidths?.leftSettingsPanel ?? 30;
        const defaultRight = props.minWidths?.rightSettingsPanel ?? 30;
        if (props.widthsInPercent) {
            return {
                leftSettingsPanel: props.widthsInPercent.leftSettingsPanel ?? defaultLeft,
                rightSettingsPanel: props.widthsInPercent.rightSettingsPanel ?? defaultRight,
            };
        }
        return { leftSettingsPanel: defaultLeft, rightSettingsPanel: defaultRight };
    }

    const [isDragging, setIsDragging] = React.useState(false);
    const [draggingPanel, setDraggingPanel] = React.useState<SettingsPanel>("leftSettingsPanel");
    const [widths, setWidths] = React.useState<SettingsPanelsWidth>(getInitialSettingPanelWidths);
    const [prevWidths, setPrevWidths] = React.useState(props.widthsInPercent);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const { width: totalWidth } = useElementSize(containerRef);

    const collapsedStatesRef = React.useRef(props.collapsedStates);
    collapsedStatesRef.current = props.collapsedStates;

    const validCollapsedPanelWidths = React.useMemo(
        function calculateValidCollapsedPanelWidths() {
            return {
                leftSettingsPanel: props.collapsedWidths?.leftSettingsPanel ?? 0,
                rightSettingsPanel: props.collapsedWidths?.rightSettingsPanel ?? 0,
            };
        },
        [props.collapsedWidths?.leftSettingsPanel, props.collapsedWidths?.rightSettingsPanel],
    );

    // Sync with controlled widthsInPercent prop
    if (!isEqual(props.widthsInPercent, prevWidths)) {
        if (props.widthsInPercent) {
            setWidths((prev) => ({
                leftSettingsPanel: props.widthsInPercent?.leftSettingsPanel ?? prev.leftSettingsPanel,
                rightSettingsPanel: props.widthsInPercent?.rightSettingsPanel ?? prev.rightSettingsPanel,
            }));
        }
        setPrevWidths(props.widthsInPercent);
    }

    // Drag handling of dragBars
    React.useEffect(
        function setupDragHandlers() {
            let changedWidths: SettingsPanelsWidth | null = null;
            let dragging = false;
            let panel: SettingsPanel = "leftSettingsPanel";

            function handlePointerDown(e: PointerEvent) {
                if (e.target instanceof HTMLElement && e.target.dataset.settingsHandle) {
                    panel = e.target.dataset.settingsHandle as SettingsPanel;
                    setDraggingPanel(panel);
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

                // Calculate collapse/expand thresholds in percent
                const collapseThresholdPercent = (COLLAPSE_EXPAND_THRESHOLD_PX / totalWidthPx) * 100;
                const collapsedWidthPx = validCollapsedPanelWidths[panel] ?? 0;
                const expandThresholdPercent = ((collapsedWidthPx + COLLAPSE_EXPAND_THRESHOLD_PX) / totalWidthPx) * 100;

                // Compute raw new width based on cursor position
                const isRightPanel = panel === "rightSettingsPanel";
                const settingsPanelWidthPx = Math.max(
                    isRightPanel ? containerRect.right - cursorX : cursorX - containerRect.left,
                    0,
                );
                const settingsPanelWidthPercent = (settingsPanelWidthPx / totalWidthPx) * 100;

                // Apply min/collapse thresholds for the dragged panel only
                const effectiveMinWidth = props.minWidths?.[panel] ?? collapsedWidthPx;
                const minWidthPercent = Math.max((effectiveMinWidth / totalWidthPx) * 100, 0);
                const collapsedWidthPercent = Math.max((collapsedWidthPx / totalWidthPx) * 100, 0);
                const isCurrentlyCollapsed = collapsedStatesRef.current?.[panel] ?? false;

                // Adjust width based on thresholds and collapsed state
                let adjustedWidthPercent = settingsPanelWidthPercent;
                if (props.visible?.[panel] === false) {
                    adjustedWidthPercent = 0;
                } else if (isCurrentlyCollapsed && effectiveMinWidth > 0) {
                    // Panel is currently collapsed — use expand threshold (hysteresis)
                    if (settingsPanelWidthPercent < expandThresholdPercent) {
                        adjustedWidthPercent = collapsedWidthPercent;
                    } else if (settingsPanelWidthPercent < minWidthPercent) {
                        adjustedWidthPercent = minWidthPercent;
                    }
                } else if (settingsPanelWidthPercent < collapseThresholdPercent) {
                    // Panel is expanded and being dragged below collapse threshold
                    adjustedWidthPercent = collapsedWidthPercent;
                } else if (settingsPanelWidthPercent < minWidthPercent) {
                    // Panel is expanded but below minWidth — snap to minWidth
                    adjustedWidthPercent = minWidthPercent;
                }

                // Detect collapsed state change for the dragged panel and
                // emit onCollapsedChange if it changed
                const wasCollapsed = collapsedStatesRef.current?.[panel] ?? false;
                const isNowCollapsed = wasCollapsed
                    ? settingsPanelWidthPercent < expandThresholdPercent
                    : settingsPanelWidthPercent < collapseThresholdPercent;

                if (isNowCollapsed !== wasCollapsed && onCollapsedChange) {
                    queueMicrotask(() =>
                        onCollapsedChange({
                            leftSettingsPanel:
                                panel === "leftSettingsPanel"
                                    ? isNowCollapsed
                                    : !!collapsedStatesRef.current?.leftSettingsPanel,
                            rightSettingsPanel:
                                panel === "rightSettingsPanel"
                                    ? isNowCollapsed
                                    : !!collapsedStatesRef.current?.rightSettingsPanel,
                        }),
                    );
                }

                setWidths((prev) => {
                    const newWidths = { ...prev, [panel]: adjustedWidthPercent };
                    changedWidths = newWidths;
                    return newWidths;
                });
            }

            function handlePointerUp() {
                if (!dragging) {
                    return;
                }
                dragging = false;
                setIsDragging(false);
                if (changedWidths && onWidthsChange) {
                    onWidthsChange(changedWidths);
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
        },
        [props.minWidths, props.visible, totalWidth, validCollapsedPanelWidths, onCollapsedChange, onWidthsChange],
    );

    function makeSettingsPanelStyle(panel: SettingsPanel): React.CSSProperties {
        const widthPercent = widths[panel];
        if (widthPercent === undefined) {
            throw new Error(`Width for panel "${panel}" is not initialized`);
        }

        const style: React.CSSProperties = {
            flexGrow: 0,
            flexShrink: 0,
            overflow: "hidden",
        };

        const isCollapsed = props.collapsedStates?.[panel];
        const isVisible = props.visible?.[panel] !== false;

        if (!isVisible) {
            style.width = 0;
            style.maxWidth = 0;
            return style;
        }

        if (isCollapsed === true) {
            const collapsedWidth = validCollapsedPanelWidths[panel];
            style.width = collapsedWidth;
            style.minWidth = collapsedWidth;
            style.maxWidth = collapsedWidth;
            return style;
        }
        const effectiveMinWidth = props.minWidths?.[panel] ?? validCollapsedPanelWidths[panel];

        // For uncontrolled panels (collapsedStates is null/undefined), detect collapse from width
        if (isCollapsed === null || isCollapsed === undefined) {
            if (totalWidth > 0 && widthPercent < (COLLAPSE_EXPAND_THRESHOLD_PX / totalWidth) * 100) {
                const collapsedWidth = validCollapsedPanelWidths[panel];
                style.width = collapsedWidth;
                style.minWidth = collapsedWidth;
                style.maxWidth = collapsedWidth;
                return style;
            }
        }

        style.width = `${widthPercent}%`;
        style.minWidth = effectiveMinWidth;

        return style;
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
            {props.children.leftSettingsPanel !== undefined && (
                <>
                    <div className="overflow-hidden" style={makeSettingsPanelStyle("leftSettingsPanel")}>
                        {props.children.leftSettingsPanel}
                    </div>
                    <SettingsDragBar
                        panel="leftSettingsPanel"
                        isDragging={isDragging && draggingPanel === "leftSettingsPanel"}
                    />
                </>
            )}
            <div className="grow overflow-hidden">{props.children.content}</div>
            {props.children.rightSettingsPanel !== undefined && (
                <>
                    <SettingsDragBar
                        panel="rightSettingsPanel"
                        isDragging={isDragging && draggingPanel === "rightSettingsPanel"}
                    />
                    <div className="overflow-hidden" style={makeSettingsPanelStyle("rightSettingsPanel")}>
                        {props.children.rightSettingsPanel}
                    </div>
                </>
            )}
        </div>
    );
}

type SettingsDragBarProps = {
    panel: "leftSettingsPanel" | "rightSettingsPanel";
    isDragging: boolean;
};

function SettingsDragBar(props: SettingsDragBarProps): React.ReactNode {
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
                data-settings-handle={props.panel}
                className="z-40 touch-none absolute bg-transparent cursor-ew-resize w-1 -left-0.25 top-0 h-full"
            />
        </div>
    );
}
