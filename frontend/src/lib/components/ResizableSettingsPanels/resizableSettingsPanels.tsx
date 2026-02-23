import React from "react";

import { isEqual } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { loadConfigurationFromLocalStorage, storeConfigurationInLocalStorage } from "./private-utils/localStorage";

const COLLAPSE_EXPAND_THRESHOLD_PX = 50;

export type ResizablePanels = {
    leftSettings?: React.ReactNode;
    content: React.ReactNode;
    rightSettings?: React.ReactNode;
};

// Define type for setting panels
type SettingsPanel = "leftSettings" | "rightSettings";

export type SettingsPanelSizes = {
    [K in SettingsPanel]?: number;
};

export type SettingsPanelCollapsedStates = {
    [K in SettingsPanel]?: boolean | null;
};

export type SettingsPanelVisibleState = {
    [K in SettingsPanel]?: boolean;
};

export type ResizableSettingsPanelsProps = {
    id: string;
    children: ResizablePanels;
    minSizes?: SettingsPanelSizes;
    sizesInPercent?: SettingsPanelSizes;
    collapsedSizes?: SettingsPanelSizes;
    collapsedStates?: SettingsPanelCollapsedStates;
    visible?: SettingsPanelVisibleState;
    onSizesChange?: (sizes: SettingsPanelSizes) => void;
    onCollapsedChange?: (states: SettingsPanelCollapsedStates) => void;
};

/**
 * Assert consistency of props — if a side panel is provided, and the size and collapse state props are provided,
 * the relevant entries for that panel must be defined.
 */
function assertPropsConsistency(props: ResizableSettingsPanelsProps) {
    const sidePanels = (["leftSettings", "rightSettings"] as const).filter(
        (panel) => props.children[panel] !== undefined,
    );

    for (const panel of sidePanels) {
        if (props.minSizes !== undefined && props.minSizes[panel] === undefined) {
            throw new Error(
                `When minSizes is provided, minSizes.${panel} must be defined when children.${panel} is defined`,
            );
        }
        if (props.sizesInPercent !== undefined && props.sizesInPercent[panel] === undefined) {
            throw new Error(
                `When sizesInPercent is provided, sizesInPercent.${panel} must be defined when children.${panel} is defined`,
            );
        }
        if (props.collapsedSizes !== undefined && props.collapsedSizes[panel] === undefined) {
            throw new Error(
                `When collapsedSizes is provided, collapsedSizes.${panel} must be defined when children.${panel} is defined`,
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
 * The settings panels can be collapsed or expanded, and their sizes can be adjusted by the user.
 * The content area automatically adjusts its size based on the sizes of the settings panels,
 * as it is the only panel with flex-grow. This avoids the issue of other panels growing when
 * a panel is collapsed.
 *
 * The children prop should contain the panels to render, with the following structure:
 * - leftSettings (optional)
 * - content (required)
 * - rightSettings (optional)
 *
 * 1 panel layout: [Content]
 * 2 panel layout: [Left Settings Panel] [Content] or [Content] [Right Settings Panel]
 * 3 panel layout: [Left Settings Panel] [Content] [Right Settings Panel]
 *
 * Sizing and collapsed-state props use the same { leftSettings?, rightSettings? } shape —
 * if a prop is provided, the value for the relevant panel(s) must be provided.
 */
export function ResizableSettingsPanels(props: ResizableSettingsPanelsProps): React.ReactNode {
    const { onSizesChange, onCollapsedChange } = props;

    // Validate consistency of props
    assertPropsConsistency(props);

    function getInitialSizes(): SettingsPanelSizes {
        const defaultLeft = props.minSizes?.leftSettings ?? 30;
        const defaultRight = props.minSizes?.rightSettings ?? 30;
        if (props.sizesInPercent) {
            return {
                leftSettings: props.sizesInPercent.leftSettings ?? defaultLeft,
                rightSettings: props.sizesInPercent.rightSettings ?? defaultRight,
            };
        }
        const loadedSizes = loadConfigurationFromLocalStorage(props.id);
        if (loadedSizes) {
            return {
                leftSettings: loadedSizes.leftSettings ?? defaultLeft,
                rightSettings: loadedSizes.rightSettings ?? defaultRight,
            };
        }
        return { leftSettings: defaultLeft, rightSettings: defaultRight };
    }

    const [isDragging, setIsDragging] = React.useState(false);
    const [draggingPanel, setDraggingPanel] = React.useState<SettingsPanel>("leftSettings");
    const [sizes, setSizes] = React.useState<SettingsPanelSizes>(getInitialSizes);
    const [prevSizes, setPrevSizes] = React.useState(props.sizesInPercent);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const { width: totalWidth } = useElementSize(containerRef);

    const collapsedStatesRef = React.useRef(props.collapsedStates);
    collapsedStatesRef.current = props.collapsedStates;

    const sizesRef = React.useRef(sizes);
    sizesRef.current = sizes;

    const validCollapsedSizes = React.useMemo(
        function calculateValidCollapsedSizes() {
            return {
                leftSettings: props.collapsedSizes?.leftSettings ?? 0,
                rightSettings: props.collapsedSizes?.rightSettings ?? 0,
            };
        },
        [props.collapsedSizes?.leftSettings, props.collapsedSizes?.rightSettings],
    );

    // Sync with controlled sizesInPercent prop
    if (!isEqual(props.sizesInPercent, prevSizes)) {
        if (props.sizesInPercent) {
            setSizes((prev) => ({
                leftSettings: props.sizesInPercent?.leftSettings ?? prev.leftSettings,
                rightSettings: props.sizesInPercent?.rightSettings ?? prev.rightSettings,
            }));
        }
        setPrevSizes(props.sizesInPercent);
    }

    const hasLeftSettings = props.children.leftSettings !== undefined;
    const hasRightSettings = props.children.rightSettings !== undefined;

    // Sync localStorage when panels are added or removed
    React.useEffect(
        function syncLocalStorageWithActivePanels() {
            storeConfigurationInLocalStorage(props.id, {
                leftSettings: hasLeftSettings ? sizesRef.current.leftSettings : undefined,
                rightSettings: hasRightSettings ? sizesRef.current.rightSettings : undefined,
            });
        },
        [props.id, hasLeftSettings, hasRightSettings],
    );

    // Drag handling of dragBars
    React.useEffect(
        function setupDragHandlers() {
            let changedSizes: SettingsPanelSizes | null = null;
            let dragging = false;
            let panel: SettingsPanel = "leftSettings";

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
                const collapsedSizePx = validCollapsedSizes[panel] ?? 0;
                const expandThresholdPercent = ((collapsedSizePx + COLLAPSE_EXPAND_THRESHOLD_PX) / totalWidthPx) * 100;

                // Compute raw new width based on cursor position
                const isRightPanel = panel === "rightSettings";
                const settingsPanelWidthPx = Math.max(
                    isRightPanel ? containerRect.right - cursorX : cursorX - containerRect.left,
                    0,
                );
                const settingsPanelWidthPercent = (settingsPanelWidthPx / totalWidthPx) * 100;

                // Apply min/collapse thresholds for the dragged panel only
                const effectiveMinSize = props.minSizes?.[panel] ?? collapsedSizePx;
                const minSizePercent = Math.max((effectiveMinSize / totalWidthPx) * 100, 0);
                const collapsedSizePercent = Math.max((collapsedSizePx / totalWidthPx) * 100, 0);
                const isCurrentlyCollapsed = collapsedStatesRef.current?.[panel] ?? false;

                // Adjust width based on thresholds and collapsed state
                let adjustedWidthPercent = settingsPanelWidthPercent;
                if (props.visible?.[panel] === false) {
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

                setSizes((prev) => {
                    const newSizes = { ...prev, [panel]: adjustedWidthPercent };
                    changedSizes = newSizes;

                    // Detect collapsed state change for the dragged panel
                    const wasCollapsed = collapsedStatesRef.current?.[panel] ?? false;
                    const isNowCollapsed = wasCollapsed
                        ? settingsPanelWidthPercent < expandThresholdPercent
                        : settingsPanelWidthPercent < collapseThresholdPercent;

                    if (isNowCollapsed !== wasCollapsed && onCollapsedChange) {
                        queueMicrotask(() =>
                            onCollapsedChange({
                                leftSettings:
                                    panel === "leftSettings"
                                        ? isNowCollapsed
                                        : !!collapsedStatesRef.current?.leftSettings,
                                rightSettings:
                                    panel === "rightSettings"
                                        ? isNowCollapsed
                                        : !!collapsedStatesRef.current?.rightSettings,
                            }),
                        );
                    }

                    return newSizes;
                });
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
                if (changedSizes && onSizesChange) {
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
        },
        [props.id, props.minSizes, props.visible, totalWidth, validCollapsedSizes, onSizesChange, onCollapsedChange],
    );

    function makeSettingsPanelStyle(panel: SettingsPanel): React.CSSProperties {
        const sizePercent = sizes[panel];
        if (sizePercent === undefined) {
            throw new Error(`Size for panel "${panel}" is not initialized`);
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
            const collapsedSize = validCollapsedSizes[panel];
            style.width = collapsedSize;
            style.minWidth = collapsedSize;
            style.maxWidth = collapsedSize;
            return style;
        }
        const effectiveMinSize = props.minSizes?.[panel] ?? validCollapsedSizes[panel];

        // For uncontrolled panels (collapsedStates is null/undefined), detect collapse from size
        if (isCollapsed === null || isCollapsed === undefined) {
            if (totalWidth > 0 && sizePercent < (COLLAPSE_EXPAND_THRESHOLD_PX / totalWidth) * 100) {
                const collapsedSize = validCollapsedSizes[panel];
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
            {props.children.leftSettings !== undefined && (
                <>
                    <div className="overflow-hidden" style={makeSettingsPanelStyle("leftSettings")}>
                        {props.children.leftSettings}
                    </div>
                    <SettingsDragBar panel="leftSettings" isDragging={isDragging && draggingPanel === "leftSettings"} />
                </>
            )}
            <div className="grow overflow-hidden">{props.children.content}</div>
            {props.children.rightSettings !== undefined && (
                <>
                    <SettingsDragBar
                        panel="rightSettings"
                        isDragging={isDragging && draggingPanel === "rightSettings"}
                    />
                    <div className="overflow-hidden" style={makeSettingsPanelStyle("rightSettings")}>
                        {props.children.rightSettings}
                    </div>
                </>
            )}
        </div>
    );
}

type SettingsDragBarProps = {
    panel: "leftSettings" | "rightSettings";
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
