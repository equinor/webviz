import React from "react";

import {
    Add,
    ChevronLeft,
    ChevronRight,
    Close,
    ContentCopy,
    Description,
    DragIndicator,
    Edit,
    MoreVert,
} from "@mui/icons-material";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import type { Dashboard } from "@framework/internal/Dashboard";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { AlertDialog } from "@lib/components/AlertDialog";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { FieldCompositions } from "@lib/components/Field/compositions";
import { Form } from "@lib/components/Form";
import { Menu } from "@lib/components/Menu";
import { Tabs } from "@lib/components/Tabs";
import { TextArea } from "@lib/components/TextArea";
import { TextInput } from "@lib/components/TextInput";
import { Tooltip } from "@lib/components/Tooltip";
import { Typography } from "@lib/components/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveSession } from "../../ActiveSessionBoundary";

export type DashboardPanelProps = {
    workbench: Workbench;
};

export function DashboardPanel(props: DashboardPanelProps) {
    const workbenchSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);
    const dashboards = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.DASHBOARDS);
    const activeDashboard = usePublishSubscribeTopicValue(
        workbenchSession,
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
    const [editingDashboard, setEditingDashboard] = React.useState<Dashboard | null>(null);
    const [dashboardPendingDeleteConfirmation, setDashboardPendingDeleteConfirmation] =
        React.useState<Dashboard | null>(null);
    const [showCannotRemoveDashboardDialog, setShowCannotRemoveDashboardDialog] = React.useState<boolean>(false);

    const tabsScrollContainerRef = React.useRef<HTMLDivElement>(null);
    const tabsContentRef = React.useRef<HTMLDivElement>(null);
    const [canScrollToPreviousDashboard, setCanScrollToPreviousDashboard] = React.useState<boolean>(false);
    const [canScrollToNextDashboard, setCanScrollToNextDashboard] = React.useState<boolean>(false);

    const updateTabsScrollButtonsState = React.useCallback(function updateTabsScrollButtonsState() {
        const el = tabsScrollContainerRef.current;
        const contentEl = tabsContentRef.current;
        if (!el || !contentEl) {
            return;
        }

        const containerWidth = el.getBoundingClientRect().width;
        const contentWidth = contentEl.getBoundingClientRect().width;
        const maxScrollLeft = Math.max(0, contentWidth - containerWidth);

        // The first tab's true resting scrollLeft isn't 0 - the scroll container's own left
        // padding (px-xs) means the natural, fully-scrolled-left position sits at the first tab's
        // actual left edge (e.g. ~8px, matching the padding), not exactly 0. Comparing against a
        // bare `> 1` threshold left the left chevron visible even when there was nothing left to
        // scroll to. getTabLeftInScrollContainer already accounts for this (used by the click
        // handlers below), so reuse it here for consistency.
        const tabs = getDashboardTabElements();
        const firstTabLeft = tabs.length > 0 ? getTabLeftInScrollContainer(tabs[0], el) : 0;
        const prev = el.scrollLeft > firstTabLeft + 1;
        const next = maxScrollLeft > 1 && el.scrollLeft < maxScrollLeft - 1;

        setCanScrollToPreviousDashboard(prev);
        setCanScrollToNextDashboard(next);
    }, []);

    // Tabs.Indicator (the active-tab underline) computes its position from getBoundingClientRect()
    // during React's render phase, i.e. before the reorder's DOM mutation is committed - so the
    // render triggered by the reorder itself always reads the pre-move position. Base-ui only gives
    // it a second, post-commit chance to re-measure via a ResizeObserver, which never fires for a
    // pure reorder of same-sized tabs (no element's size changes). Without this, the indicator gets
    // stuck at its pre-reorder position until some unrelated interaction (e.g. switching tabs) forces
    // a fresh measurement. Forcing an extra render after the tab order changes gives it that missing
    // post-commit remeasure.
    //
    // Depend on the *ordered id sequence* (a fresh string each render), not on `dashboards` itself:
    // PrivateWorkbenchSession.moveDashboard() reorders the underlying array in place (splice), it
    // never replaces it, so the array reference stays identical across a reorder and would never
    // register as a changed dependency.
    const dashboardOrderKey = dashboards.map((dashboard) => dashboard.getId()).join("|");
    const [, forceIndicatorSync] = React.useReducer((count: number) => count + 1, 0);
    React.useLayoutEffect(
        function resyncTabStripOnDashboardsChange() {
            forceIndicatorSync();
            updateTabsScrollButtonsState();
        },
        [dashboardOrderKey, updateTabsScrollButtonsState],
    );

    React.useEffect(
        function observeTabsScrollContainer() {
            const el = tabsScrollContainerRef.current;
            const contentEl = tabsContentRef.current;
            if (!el || !contentEl) {
                return;
            }

            // Observe both the scroll container (its allotted width can change, e.g. on window
            // resize) and the tab content itself (its natural width changes whenever a dashboard
            // is added or removed), since either one can change whether the content overflows.
            const handleResize = () => updateTabsScrollButtonsState();
            const handleScroll = () => updateTabsScrollButtonsState();
            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(el);
            resizeObserver.observe(contentEl);
            el.addEventListener("scroll", handleScroll);

            return () => {
                resizeObserver.disconnect();
                el.removeEventListener("scroll", handleScroll);
            };
        },
        [updateTabsScrollButtonsState],
    );

    function getDashboardTabElements(): HTMLElement[] {
        const el = tabsScrollContainerRef.current;
        if (!el) {
            return [];
        }
        return Array.from(el.querySelectorAll<HTMLElement>('[role="tab"]'));
    }

    // A tab's own offsetLeft is relative to its offsetParent (Tabs.List, which is position:
    // relative), not to the scroll container - so it doesn't account for the scroll container's
    // own left padding (px-xs). Computing scroll targets from raw offsetLeft therefore undershoots
    // by exactly that padding amount, which - combined with scroll-snap-type: x mandatory - made
    // the browser reject the scroll outright (a mandatory snap container won't land on a position
    // that isn't a valid snap point), leaving scrollLeft stuck. Measuring via getBoundingClientRect
    // deltas against the scroll container itself is padding/offsetParent-agnostic and gives the
    // tab's true position in the container's own scrollable coordinate space.
    function getTabLeftInScrollContainer(tab: HTMLElement, scrollContainer: HTMLElement): number {
        return (
            tab.getBoundingClientRect().left - scrollContainer.getBoundingClientRect().left + scrollContainer.scrollLeft
        );
    }

    function handleScrollToPreviousDashboard() {
        const el = tabsScrollContainerRef.current;
        if (!el) {
            return;
        }
        const tabs = getDashboardTabElements();
        const previousTab = [...tabs].reverse().find((tab) => getTabLeftInScrollContainer(tab, el) < el.scrollLeft - 1);
        const target = previousTab ? getTabLeftInScrollContainer(previousTab, el) : 0;
        el.scrollTo({ left: target, behavior: "smooth" });
    }

    function handleScrollToNextDashboard() {
        const el = tabsScrollContainerRef.current;
        if (!el) {
            return;
        }
        const tabs = getDashboardTabElements();
        // Mirrors handleScrollToPreviousDashboard: step by exactly one tab, not by a full page.
        // Finding "the first tab not fully visible" instead jumps forward by however many tabs
        // currently fit in the viewport at once (observed: with 7 tabs fitting at once, one click
        // jumped from tab 4 straight to tab 10) - inconsistent with "previous" always stepping back
        // by one.
        const nextTab = tabs.find((tab) => getTabLeftInScrollContainer(tab, el) > el.scrollLeft + 1);
        if (nextTab) {
            el.scrollTo({ left: getTabLeftInScrollContainer(nextTab, el), behavior: "smooth" });
        }
    }

    // Switching dashboards runs synchronous work proportional to the outgoing/incoming dashboard's
    // module count (tearing down and recreating module instances) - calling setActiveDashboard
    // directly from the click handler blocks the tab bar's own re-render (which tab is highlighted)
    // behind that work. optimisticActiveDashboardId lets the tab bar show the clicked tab as
    // selected immediately, painting on this frame, while the actual (still fully synchronous)
    // switch is deferred to the next frame via requestAnimationFrame. This is purely a GUI-layer
    // responsiveness concern, kept out of the framework/session layer entirely.
    const [optimisticActiveDashboardId, setOptimisticActiveDashboardId] = React.useState<string | null>(null);
    const latestRequestedDashboardIdRef = React.useRef<string | null>(null);

    const handleActiveDashboardChange = React.useCallback(
        function handleActiveDashboardChange(dashboardId: string) {
            latestRequestedDashboardIdRef.current = dashboardId;
            setOptimisticActiveDashboardId(dashboardId);
            // Set alongside the optimistic tab selection so both paint on this same frame, giving
            // the content area a chance to show a loading state covering the whole (unavoidably
            // blocking) switch that happens after the double rAF below.
            props.workbench.getGuiMessageBroker().setState(GuiState.IsSwitchingDashboard, true);
            // A single requestAnimationFrame runs BEFORE that frame's paint, not after - scheduling
            // the heavy work in just one rAF lands it in the exact same paint cycle as the tab
            // highlight/loading overlay update above, so that update never actually reaches the
            // screen before the freeze. Nesting rAF twice defers the heavy work to the frame AFTER
            // the one that paints this callback's own DOM changes, guaranteeing that paint has
            // already happened by the time the (still synchronous, blocking) switch runs.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // If another tab was clicked before this frame arrived, let that newer request
                    // win instead of switching to this now-stale one.
                    if (latestRequestedDashboardIdRef.current !== dashboardId) {
                        return;
                    }
                    workbenchSession.setActiveDashboard(dashboardId);
                    setOptimisticActiveDashboardId(null);
                    props.workbench.getGuiMessageBroker().setState(GuiState.IsSwitchingDashboard, false);
                });
            });
        },
        [workbenchSession, props.workbench],
    );

    const [draggedDashboardId, setDraggedDashboardId] = React.useState<string | null>(null);
    const [dropTarget, setDropTarget] = React.useState<{ dashboardId: string; insertAfter: boolean } | null>(null);
    const dragImageRef = React.useRef<HTMLDivElement>(null);

    // Native HTML5 drag-and-drop, not SortableList: SortableList's ghost-clone mechanism duplicates
    // the dragged element into a portal, which breaks Tabs.Tab (a stateful base-ui component that
    // registers with Tabs.Root/Tabs.Indicator) - two simultaneously-mounted instances with the same
    // value fight over the active-tab indicator's positioning and cause a render loop. Native DnD
    // never clones the element, so it doesn't hit that problem.
    const handleDashboardDragStart = React.useCallback(function handleDashboardDragStart(
        dashboardId: string,
        event: React.DragEvent,
    ) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", dashboardId);
        if (dragImageRef.current) {
            event.dataTransfer.setDragImage(dragImageRef.current, 12, 12);
        }
        setDraggedDashboardId(dashboardId);
    }, []);

    const handleDashboardDragOver = React.useCallback(
        function handleDashboardDragOver(dashboardId: string, event: React.DragEvent) {
            if (!draggedDashboardId || draggedDashboardId === dashboardId) {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";

            const rect = event.currentTarget.getBoundingClientRect();
            const insertAfter = event.clientX - rect.left > rect.width / 2;
            setDropTarget((prev) => {
                if (prev?.dashboardId === dashboardId && prev.insertAfter === insertAfter) {
                    return prev;
                }
                return { dashboardId, insertAfter };
            });
        },
        [draggedDashboardId],
    );

    const handleDashboardDrop = React.useCallback(
        function handleDashboardDrop(targetDashboardId: string, event: React.DragEvent) {
            event.preventDefault();
            const draggedId = event.dataTransfer.getData("text/plain");
            const insertAfter = dropTarget?.dashboardId === targetDashboardId && dropTarget.insertAfter;
            setDraggedDashboardId(null);
            setDropTarget(null);

            if (!draggedId || draggedId === targetDashboardId) {
                return;
            }
            const draggedIndex = dashboards.findIndex((d) => d.getId() === draggedId);
            const targetIndex = dashboards.findIndex((d) => d.getId() === targetDashboardId);
            if (draggedIndex === -1 || targetIndex === -1) {
                return;
            }

            // moveDashboard's newIndex is a position in the array *after* the dragged item has
            // already been removed - shift the target index down by one when the dragged item
            // currently sits before it, since removing it closes that gap.
            const postRemovalTargetIndex = targetIndex - (draggedIndex < targetIndex ? 1 : 0);
            const newIndex = insertAfter ? postRemovalTargetIndex + 1 : postRemovalTargetIndex;
            workbenchSession.moveDashboard(draggedId, newIndex);
        },
        [dashboards, dropTarget, workbenchSession],
    );

    const handleDashboardDragEnd = React.useCallback(function handleDashboardDragEnd() {
        setDraggedDashboardId(null);
        setDropTarget(null);
    }, []);

    const handleAddDashboardClick = React.useCallback(
        function handleAddDashboardClick() {
            workbenchSession.addDashboard();
        },
        [workbenchSession],
    );

    const handleEditDashboardClick = React.useCallback(
        function handleEditDashboardClick(dashboardId: string) {
            setEditingDashboard(dashboards.find((d) => d.getId() === dashboardId) || null);
        },
        [dashboards],
    );

    const handleRemoveDashboardClick = React.useCallback(
        function handleRemoveDashboardClick(dashboardId: string) {
            workbenchSession.removeDashboard(dashboardId);
        },
        [workbenchSession],
    );

    const handleRequestDeleteDashboard = React.useCallback(
        function handleRequestDeleteDashboard(dashboardId: string) {
            const dashboard = dashboards.find((d) => d.getId() === dashboardId);
            if (!dashboard) {
                console.debug(`Dashboard with id ${dashboardId} not found`);
                return;
            }
            if (dashboards.length === 1) {
                setShowCannotRemoveDashboardDialog(true);
                return;
            }
            if (dashboard.getModuleInstances().length === 0) {
                handleRemoveDashboardClick(dashboard.getId());
                return;
            }
            setDashboardPendingDeleteConfirmation(dashboard);
        },
        [dashboards, handleRemoveDashboardClick],
    );

    const handleCloneDashboardClick = React.useCallback(
        function handleCloneDashboardClick(dashboardId: string) {
            workbenchSession.cloneDashboard(dashboardId);
        },
        [workbenchSession],
    );

    return (
        <div className="gap-xs -mt-[2px] flex w-full items-center">
            <div className="gap-3xs flex min-w-0 items-center">
                <Button
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    size="small"
                    disabled={!canScrollToPreviousDashboard}
                    onClick={handleScrollToPreviousDashboard}
                    layoutClassName={canScrollToPreviousDashboard ? "" : "invisible"}
                >
                    <ChevronLeft fontSize="small" />
                </Button>
                <div
                    ref={tabsScrollContainerRef}
                    className={resolveClassNames(
                        "px-xs min-w-0 scrollbar-none overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                        {
                            // Only snap while the strip can actually scroll. With scroll-snap-type
                            // mandatory always on, removing a dashboard so the remaining tabs fit
                            // without scrolling left the browser's own snap-correction machinery
                            // fighting to "settle" scrollLeft (observed via logging: it oscillated
                            // between the old scroll position and 0 over ~150-200ms) - there's
                            // nothing to snap between once everything already fits, so there's
                            // nothing left to correct.
                            "snap-x snap-mandatory": canScrollToPreviousDashboard || canScrollToNextDashboard,
                        },
                    )}
                >
                    <Tabs.Root
                        ref={tabsContentRef}
                        onValueChange={handleActiveDashboardChange}
                        value={optimisticActiveDashboardId ?? activeDashboard?.getId() ?? ""}
                        layoutClassName="w-max"
                    >
                        <Tabs.List size="small" indicatorPosition="start">
                            {dashboards.map((dashboard) => (
                                <DashboardTab
                                    key={dashboard.getId()}
                                    dashboard={dashboard}
                                    draggable={!isSnapshot}
                                    isDragged={draggedDashboardId === dashboard.getId()}
                                    dropIndicatorSide={
                                        dropTarget?.dashboardId === dashboard.getId()
                                            ? dropTarget.insertAfter
                                                ? "after"
                                                : "before"
                                            : null
                                    }
                                    onRequestDelete={handleRequestDeleteDashboard}
                                    onEdit={handleEditDashboardClick}
                                    onDragStart={(e) => handleDashboardDragStart(dashboard.getId(), e)}
                                    onDragOver={(e) => handleDashboardDragOver(dashboard.getId(), e)}
                                    onDrop={(e) => handleDashboardDrop(dashboard.getId(), e)}
                                    onDragEnd={handleDashboardDragEnd}
                                    onClone={handleCloneDashboardClick}
                                />
                            ))}
                        </Tabs.List>
                    </Tabs.Root>
                </div>
                <Button
                    iconOnly
                    variant="ghost"
                    tone="neutral"
                    size="small"
                    disabled={!canScrollToNextDashboard}
                    onClick={handleScrollToNextDashboard}
                    layoutClassName={canScrollToNextDashboard ? "" : "invisible"}
                >
                    <ChevronRight fontSize="small" />
                </Button>
            </div>
            <Tooltip
                content={isSnapshot ? "Dashboards cannot be modified in snapshot mode" : "Add new dashboard"}
                side="bottom"
            >
                <Button
                    disabled={isSnapshot}
                    iconOnly
                    onClick={handleAddDashboardClick}
                    tone="accent"
                    variant="ghost"
                    size="small"
                >
                    <Add fontSize="small" />
                </Button>
            </Tooltip>
            {editingDashboard && (
                <EditDashboardMetadataDialog
                    workbench={props.workbench}
                    dashboard={editingDashboard}
                    onClose={() => setEditingDashboard(null)}
                />
            )}
            {dashboardPendingDeleteConfirmation && (
                <AlertDialog
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDashboardPendingDeleteConfirmation(null);
                        }
                    }}
                    title="Really delete dashboard?"
                    primaryAction={{
                        label: "Yes, delete",
                        onClick: () => handleRemoveDashboardClick(dashboardPendingDeleteConfirmation.getId()),
                        tone: "danger",
                        closesDialog: true,
                    }}
                    secondaryActions={[
                        {
                            label: "No, cancel",
                            onClick: () => setDashboardPendingDeleteConfirmation(null),
                            tone: "neutral",
                            closesDialog: true,
                        },
                    ]}
                >
                    Deleting this dashboard will remove it and all the modules it contains from your session. This
                    action cannot be undone.
                </AlertDialog>
            )}
            {showCannotRemoveDashboardDialog && (
                <AlertDialog
                    open={showCannotRemoveDashboardDialog}
                    onOpenChange={setShowCannotRemoveDashboardDialog}
                    title="Cannot remove last dashboard"
                    primaryAction={{
                        label: "OK",
                        onClick: () => setShowCannotRemoveDashboardDialog(false),
                        tone: "neutral",
                        closesDialog: true,
                    }}
                >
                    A session must contain at least one dashboard. Add another dashboard before removing this one.
                </AlertDialog>
            )}
            {/* Custom drag image (a generic document icon, rather than the tiny drag handle icon
                itself) used via dataTransfer.setDragImage in handleDashboardDragStart. Rendered
                off-screen since it only needs to exist as a DOM node for the browser to snapshot. */}
            <div
                ref={dragImageRef}
                className="bg-surface border-neutral-subtle text-accent-strong pointer-events-none fixed flex h-6 w-6 items-center justify-center rounded border shadow"
                style={{ left: -9999, top: 0 }}
                aria-hidden
            >
                <Description fontSize="small" />
            </div>
        </div>
    );
}

type DashboardTabProps = {
    dashboard: Dashboard;
    draggable: boolean;
    isDragged: boolean;
    dropIndicatorSide: "before" | "after" | null;
    onRequestDelete: (dashboardId: string) => void;
    onEdit: (dashboardId: string) => void;
    onDragStart: (event: React.DragEvent, dashboardId: string) => void;
    onDragOver: (event: React.DragEvent, dashboardId: string) => void;
    onDrop: (event: React.DragEvent, dashboardId: string) => void;
    onDragEnd: () => void;
    onClone: (dashboardId: string) => void;
};

function DashboardTab(props: DashboardTabProps) {
    const { onRequestDelete, onEdit, onClone, onDragStart, onDragOver, onDrop } = props;
    const metadata = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.METADATA);

    const handleDeleteClick = React.useCallback(
        function handleDeleteClick(event: React.MouseEvent) {
            event.stopPropagation();
            onRequestDelete(props.dashboard.getId());
        },
        [onRequestDelete, props.dashboard],
    );

    const handleEditClick = React.useCallback(
        function handleEditClick(event: React.MouseEvent) {
            event.stopPropagation();
            onEdit(props.dashboard.getId());
        },
        [onEdit, props.dashboard],
    );

    const handleCloneClick = React.useCallback(
        function handleCloneClick(event: React.MouseEvent) {
            event.stopPropagation();
            onClone(props.dashboard.getId());
        },
        [onClone, props.dashboard],
    );

    const handleDragStart = React.useCallback(
        function handleDragStart(event: React.DragEvent) {
            onDragStart(event, props.dashboard.getId());
        },
        [onDragStart, props.dashboard],
    );

    const handleDragOver = React.useCallback(
        function handleDragOver(event: React.DragEvent) {
            onDragOver(event, props.dashboard.getId());
        },
        [onDragOver, props.dashboard],
    );

    const handleDrop = React.useCallback(
        function handleDrop(event: React.DragEvent) {
            onDrop(event, props.dashboard.getId());
        },
        [onDrop, props.dashboard],
    );

    return (
        <>
            <div className="relative w-0">
                {props.dropIndicatorSide === "before" && (
                    <div className="bg-accent-strong absolute top-0 -left-0.5 h-full w-1" />
                )}
            </div>
            <Tooltip content={props.dashboard.getMetadata().name} side="bottom">
                <Tabs.Tab
                    as="div"
                    value={props.dashboard.getId()}
                    layoutClassName={resolveClassNames("relative flex items-center gap-x-xs snap-start", {
                        "opacity-50": props.isDragged,
                    })}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <span
                        draggable={props.draggable}
                        onDragStart={handleDragStart}
                        onDragEnd={props.onDragEnd}
                        className={resolveClassNames("flex items-center", {
                            "cursor-grab": props.draggable,
                        })}
                    >
                        <DragIndicator fontSize="inherit" className="pointer-events-none" />
                    </span>
                    <span className="truncate">{metadata.name}</span>
                    <Menu.Root>
                        <Menu.Trigger>
                            <Button iconOnly variant="ghost" size="small" onClick={(e) => e.stopPropagation()}>
                                <MoreVert />
                            </Button>
                        </Menu.Trigger>
                        <Menu.Popup>
                            <Menu.Group>
                                <Menu.GroupLabel>{metadata.name}</Menu.GroupLabel>
                                <Menu.Item onClick={handleEditClick} icon={<Edit />}>
                                    Edit
                                </Menu.Item>
                                <Menu.Item onClick={handleCloneClick} icon={<ContentCopy />}>
                                    Clone
                                </Menu.Item>
                                <Menu.Separator />
                                <Menu.Item onClick={handleDeleteClick} icon={<Close />} tone="danger">
                                    Delete
                                </Menu.Item>
                            </Menu.Group>
                        </Menu.Popup>
                    </Menu.Root>
                </Tabs.Tab>
            </Tooltip>
            <div className="relative w-0">
                {props.dropIndicatorSide === "after" && (
                    <div className="bg-accent-strong absolute top-0 -left-0.5 h-full w-1" />
                )}
            </div>
        </>
    );
}

type EditDashboardMetadataDialogProps = {
    workbench: Workbench;
    dashboard: Dashboard;
    onClose: () => void;
};

function EditDashboardMetadataDialog(props: EditDashboardMetadataDialogProps) {
    const { onClose } = props;
    const workbenchSession = useActiveSession();

    const metadata = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.METADATA);
    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const [name, setName] = React.useState(props.dashboard?.getMetadata().name || "");
    const [description, setDescription] = React.useState<string>(props.dashboard?.getMetadata().description ?? "");
    const [showConfirmationDialog, setShowConfirmationDialog] = React.useState<boolean>(false);

    const inputRef = React.useRef<HTMLInputElement>(null);
    const formId = React.useId();

    const handleSubmit = React.useCallback(
        function handleSubmit(event: React.FormEvent) {
            event.preventDefault();
            if (name.trim() === "") {
                inputRef.current?.focus();
                return;
            }

            if (workbenchSession) {
                props.dashboard.updateMetadata({ name, description });
                props.workbench
                    .getSessionManager()
                    .saveSession()
                    .then((result) => {
                        if (result) {
                            onClose?.();
                        }
                    })
                    .catch((error) => {
                        console.error("Failed to save session:", error);
                    });
                return;
            }
        },
        [name, description, props.dashboard, props.workbench, workbenchSession, onClose],
    );

    function handleCancel() {
        if (name !== metadata.name || description !== (metadata.description ?? "")) {
            setShowConfirmationDialog(true);
            return;
        }
        handleDiscardChanges();
    }

    function handleDiscardChanges() {
        setName(metadata.name);
        setDescription(metadata.description ?? "");
        props.onClose?.();
    }

    return (
        <>
            <Dialog.Popup open={true} onOpenChange={handleCancel} minWidth={400}>
                <Dialog.Header closeIconVisible>
                    <Dialog.Title>Edit dashboard name and description</Dialog.Title>
                </Dialog.Header>
                <Form onSubmit={handleSubmit} id={formId}>
                    <Dialog.Body layoutClassName="flex flex-col gap-y-sm">
                        <FieldCompositions.Default
                            label="Name"
                            indicator="(Required)"
                            info={`Enter a descriptive name for your dashboard. This must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters.`}
                            validationMode="onSubmit"
                        >
                            <TextInput
                                minLength={MIN_TITLE_LENGTH}
                                maxLength={MAX_TITLE_LENGTH}
                                ref={inputRef}
                                value={name}
                                onValueChange={(val) => setName(val)}
                                placeholder="Enter dashboard name"
                                autoFocus
                                required
                                endAdornment={
                                    <Tooltip
                                        content={`Your name is currently using ${name.length} out of the maximum ${MAX_TITLE_LENGTH} characters.`}
                                    >
                                        <Typography
                                            size="sm"
                                            family="body"
                                            tone="neutral"
                                        >{`${name.length}/${MAX_TITLE_LENGTH}`}</Typography>
                                    </Tooltip>
                                }
                            />
                        </FieldCompositions.Default>
                        <FieldCompositions.Default label="Description" indicator="(Optional)">
                            <TextArea
                                maxLength={MAX_DESCRIPTION_LENGTH}
                                value={description}
                                onValueChange={(val) => setDescription(val)}
                                placeholder="Enter dashboard description"
                                rows={3}
                                bottomAdornment={
                                    <Tooltip
                                        content={`Your description is currently using ${description.length} out of the maximum ${MAX_DESCRIPTION_LENGTH} characters.`}
                                    >
                                        <Typography
                                            size="sm"
                                            family="body"
                                            tone="neutral"
                                        >{`${description.length}/${MAX_DESCRIPTION_LENGTH}`}</Typography>
                                    </Tooltip>
                                }
                            />
                        </FieldCompositions.Default>
                    </Dialog.Body>
                    <Dialog.Actions>
                        <Button tone="neutral" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button type="submit" tone="accent" disabled={isSaving} onClick={handleSubmit}>
                            {isSaving ? <CircularProgress size="em" /> : "Save"}
                        </Button>
                    </Dialog.Actions>
                </Form>
            </Dialog.Popup>
            <AlertDialog
                open={showConfirmationDialog}
                onOpenChange={setShowConfirmationDialog}
                title="Discard changes?"
                primaryAction={{
                    label: "Discard",
                    onClick: handleDiscardChanges,
                    tone: "danger",
                    closesDialog: true,
                }}
                secondaryActions={[
                    {
                        label: "Keep editing",
                        onClick: () => setShowConfirmationDialog(false),
                        tone: "neutral",
                        closesDialog: true,
                    },
                ]}
            >
                You have unsaved changes. Are you sure you want to discard them and close the dialog?
            </AlertDialog>
        </>
    );
}
