import { Add, ChevronLeft, ChevronRight, Close, Edit, GridView, More, MoreVert } from "@mui/icons-material";

import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import { GuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Separator } from "@lib/components/Separator";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { Tabs } from "@lib/components/Tabs";
import React from "react";
import { useActiveSession } from "../../ActiveSessionBoundary";
import { Dialog } from "@lib/components/Dialog";
import { Form } from "@lib/components/Form";
import { FieldCompositions } from "@lib/components/Field/compositions";
import { TextInput } from "@lib/components/TextInput";
import { Dashboard, DashboardTopic } from "@framework/internal/Dashboard";
import { Typography } from "@lib/components/Typography";
import { TextArea } from "@lib/components/TextArea";
import { Menu } from "@lib/components/Menu";
import { AlertDialog } from "@lib/components/AlertDialog";

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

    const tabsScrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [canScrollToPreviousDashboard, setCanScrollToPreviousDashboard] = React.useState<boolean>(false);
    const [canScrollToNextDashboard, setCanScrollToNextDashboard] = React.useState<boolean>(false);

    const updateTabsScrollButtonsState = React.useCallback(function updateTabsScrollButtonsState() {
        const el = tabsScrollContainerRef.current;
        if (!el) {
            return;
        }
        setCanScrollToPreviousDashboard(el.scrollLeft > 1);
        setCanScrollToNextDashboard(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    React.useEffect(
        function observeTabsScrollContainer() {
            const el = tabsScrollContainerRef.current;
            if (!el) {
                return;
            }
            updateTabsScrollButtonsState();

            const resizeObserver = new ResizeObserver(updateTabsScrollButtonsState);
            resizeObserver.observe(el);
            el.addEventListener("scroll", updateTabsScrollButtonsState);

            return () => {
                resizeObserver.disconnect();
                el.removeEventListener("scroll", updateTabsScrollButtonsState);
            };
        },
        [updateTabsScrollButtonsState, dashboards],
    );

    function getDashboardTabElements(): HTMLElement[] {
        const el = tabsScrollContainerRef.current;
        if (!el) {
            return [];
        }
        return Array.from(el.querySelectorAll<HTMLElement>('[role="tab"]'));
    }

    function handleScrollToPreviousDashboard() {
        const el = tabsScrollContainerRef.current;
        if (!el) {
            return;
        }
        const tabs = getDashboardTabElements();
        const previousTab = [...tabs].reverse().find((tab) => tab.offsetLeft < el.scrollLeft - 1);
        el.scrollTo({ left: previousTab?.offsetLeft ?? 0, behavior: "smooth" });
    }

    function handleScrollToNextDashboard() {
        const el = tabsScrollContainerRef.current;
        if (!el) {
            return;
        }
        const tabs = getDashboardTabElements();
        const nextTab = tabs.find((tab) => tab.offsetLeft + tab.offsetWidth > el.scrollLeft + el.clientWidth + 1);
        if (nextTab) {
            el.scrollTo({ left: nextTab.offsetLeft, behavior: "smooth" });
        }
    }

    const handleActiveDashboardChange = React.useCallback(
        function handleActiveDashboardChange(dashboardId: string) {
            workbenchSession.setActiveDashboard(dashboardId);
        },
        [workbenchSession],
    );

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

    return (
        <div className="gap-xs -mt-[2px] flex w-full items-center">
            <div className="gap-3xs flex min-w-0 flex-1 items-center">
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
                    className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    <Tabs.Root
                        onValueChange={handleActiveDashboardChange}
                        value={activeDashboard?.getId() || ""}
                        layoutClassName="w-max"
                    >
                        <Tabs.List size="small" indicatorPosition="start">
                            {dashboards.map((dashboard) => (
                                <DashboardTab
                                    key={dashboard.getId()}
                                    dashboard={dashboard}
                                    onDelete={() => {
                                        handleRemoveDashboardClick(dashboard.getId());
                                    }}
                                    onEdit={() => {
                                        handleEditDashboardClick(dashboard.getId());
                                    }}
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
        </div>
    );
}

type DashboardTabProps = {
    dashboard: Dashboard;
    onDelete: () => void;
    onEdit: () => void;
};

function DashboardTab(props: DashboardTabProps) {
    const metadata = usePublishSubscribeTopicValue(props.dashboard, DashboardTopic.METADATA);
    const [showConfirmationDialog, setShowConfirmationDialog] = React.useState<boolean>(false);

    const handleDeleteClick = React.useCallback(
        function handleDeleteClick(event: React.MouseEvent) {
            event.stopPropagation();
            setShowConfirmationDialog(true);
        },
        [setShowConfirmationDialog],
    );

    const handleEditClick = React.useCallback(
        function handleEditClick(event: React.MouseEvent) {
            event.stopPropagation();
            props.onEdit();
        },
        [props],
    );

    return (
        <>
            <Tooltip content={props.dashboard.getMetadata().name} side="bottom">
                <Tabs.Tab value={props.dashboard.getId()} layoutClassName="flex items-center gap-x-xs">
                    <span className="truncate">{metadata.name}</span>
                    <Menu.Root>
                        <Menu.Trigger>
                            <Button iconOnly variant="ghost" size="small" onClick={(e) => e.stopPropagation()}>
                                <MoreVert />
                            </Button>
                        </Menu.Trigger>
                        <Menu.Popup>
                            <Menu.Item onClick={handleEditClick} icon={<Edit />}>
                                Edit
                            </Menu.Item>
                            <Menu.Item onClick={handleDeleteClick} icon={<Close />}>
                                Delete
                            </Menu.Item>
                        </Menu.Popup>
                    </Menu.Root>
                </Tabs.Tab>
            </Tooltip>
            {showConfirmationDialog && (
                <AlertDialog
                    open={showConfirmationDialog}
                    onOpenChange={setShowConfirmationDialog}
                    title="Really delete dashboard?"
                    primaryAction={{
                        label: "Yes, delete",
                        onClick: props.onDelete,
                        tone: "danger",
                        closesDialog: true,
                    }}
                    secondaryActions={[
                        {
                            label: "No, cancel",
                            onClick: () => setShowConfirmationDialog(false),
                            tone: "neutral",
                            closesDialog: true,
                        },
                    ]}
                >
                    Deleting this dashboard will remove it and all the modules it contains from your session. This
                    action cannot be undone.
                </AlertDialog>
            )}
        </>
    );
}

type EditDashboardMetadataDialogProps = {
    workbench: Workbench;
    dashboard: Dashboard;
    onClose: () => void;
};

function EditDashboardMetadataDialog(props: EditDashboardMetadataDialogProps) {
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
                            props.onClose?.();
                        }
                    })
                    .catch((error) => {
                        console.error("Failed to save session:", error);
                    });
                return;
            }
        },
        [name, props],
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
                    <Dialog.Title>Edit dashboard name and title</Dialog.Title>
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
                                        content={`Your descriptions is currently using ${description.length} out of the maximum ${MAX_DESCRIPTION_LENGTH} characters.`}
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
