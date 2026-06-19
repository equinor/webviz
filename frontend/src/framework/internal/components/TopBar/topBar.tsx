import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { category } from "@equinor/eds-icons";
import {
    AddLink,
    ArrowDropDown,
    Close,
    Edit,
    Fullscreen,
    FullscreenExit,
    Info,
    Link,
    Lock,
    Refresh,
    Save,
    SaveAs,
} from "@mui/icons-material";

import { FmuLogo } from "@assets/FmuLogo";

import { GuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import { useBrowserFullscreen } from "@framework/internal/hooks/useBrowserFullscreen";
import { PersistenceOrchestratorTopic } from "@framework/internal/persistence/core/PersistenceOrchestrator";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { WorkbenchSessionManagerTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import { type Workbench } from "@framework/Workbench";
import { Button, type ButtonProps } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { HasChangesIndicator } from "@lib/newComponents/HasChangesIndicator";
import { MenuCompositions } from "@lib/newComponents/Menu/compositions";
import { Popover } from "@lib/newComponents/Popover";
import { Separator } from "@lib/newComponents/Separator";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Typography } from "@lib/newComponents/Typography";
import { Heading, Paragraph } from "@lib/newComponents/Typography/compositions";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { DarkModeButton } from "../DarkModeButton";
import { DensityModeToggle } from "../DensityModeToggle/densityModeToggle";
import { EditSessionMetadataDialog } from "../EditSessionMetadataDialog";
import { LoginButton } from "../LoginButton";
import { ToggleDevToolsButton } from "../ToggleDevToolsButton";

export type TopBarProps = {
    workbench: Workbench;
};

Icon.add({ category });

export function TopBar(props: TopBarProps): React.ReactNode {
    const hasActiveSession = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION,
    );

    return (
        <>
            <div
                className={resolveClassNames(
                    "border-neutral-subtle shadow-elevation-raised z-sticky gap-x-sm py-2xs px-xs flex flex-row items-center border-b-2",
                    {
                        "bg-surface": hasActiveSession,
                        "bg-transparent": !hasActiveSession,
                    },
                )}
            >
                <LogoWithText />
                <div className="gap-x-xs flex min-w-0 grow items-center">
                    {hasActiveSession ? (
                        <>
                            <Separator orientation="vertical" />
                            <Title workbench={props.workbench} />
                            <TopBarButtons workbench={props.workbench} />
                        </>
                    ) : (
                        <div className="grow" />
                    )}
                    <Separator orientation="vertical" />
                    <FullscreenToggleButton />
                    <DarkModeButton />
                    <DensityModeToggle />
                    <ToggleDevToolsButton guiMessageBroker={props.workbench.getGuiMessageBroker()} />
                    <Separator orientation="vertical" />
                    <LoginButton showText={false} />
                </div>
            </div>
        </>
    );
}
function LogoWithText(): React.ReactNode {
    return (
        <div className="gap-x-sm flex flex-row items-center">
            <FmuLogo className="h-8 w-8" />
            <Heading as="h6" weight="bolder">
                FMU Analysis
            </Heading>
            <div
                className="bg-warning-strong text-neutral-strong-on-emphasis text-body-sm px-xs py-3xs cursor-help rounded-sm text-center"
                title="NOTE: This application is still under heavy development and bugs are to be expected. Please help us improve Webviz by reporting any undesired behaviour either on Slack or Yammer."
            >
                BETA
            </div>
        </div>
    );
}

function FullscreenToggleButton(): React.ReactNode {
    const [isFullscreen, toggleFullScreen] = useBrowserFullscreen();

    const fullscreenButtonTitle = isFullscreen ? "Exit fullscreen (F11)" : "Enter fullscreen (F11)";

    return (
        <Tooltip content={fullscreenButtonTitle} side="bottom">
            <TopBarButton title={fullscreenButtonTitle} onClick={toggleFullScreen}>
                {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </TopBarButton>
        </Tooltip>
    );
}

type TopBarButtonsProps = {
    workbench: Workbench;
};

function TopBarButtons(props: TopBarButtonsProps): React.ReactNode {
    const isSnapshot = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getActiveSession(),
        PrivateWorkbenchSessionTopic.IS_SNAPSHOT,
    );

    function handleCloseSessionClick() {
        props.workbench.getSessionManager().maybeCloseCurrentSession();
    }
    const closeButtonTitle = isSnapshot ? "Close snapshot" : "Close session";

    return (
        <>
            {isSnapshot ? (
                <SessionFromSnapshotButton workbench={props.workbench} />
            ) : (
                <>
                    <EditSessionButton workbench={props.workbench} />
                    <Separator orientation="vertical" />
                    <RefreshSessionButton workbench={props.workbench} />
                    <SessionSaveButton workbench={props.workbench} />
                    <SnapshotButton workbench={props.workbench} />
                </>
            )}
            <Tooltip content={closeButtonTitle} side="bottom">
                <TopBarButton onClick={handleCloseSessionClick} title={closeButtonTitle}>
                    <Close fontSize="small" />
                </TopBarButton>
            </Tooltip>
        </>
    );
}

type EditSessionButtonProps = {
    workbench: Workbench;
};

function EditSessionButton(props: EditSessionButtonProps): React.ReactNode {
    const activeWorkbenchSession = props.workbench.getSessionManager().getActiveSession();
    const [editSessionDialogOpen, setEditSessionDialogOpen] = React.useState<boolean>(false);

    const isPersisted = usePublishSubscribeTopicValue(
        activeWorkbenchSession,
        PrivateWorkbenchSessionTopic.IS_PERSISTED,
    );

    const isSnapshot = usePublishSubscribeTopicValue(activeWorkbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    function handleEditTitleClick() {
        setEditSessionDialogOpen(true);
    }

    if (isSnapshot || !isPersisted) {
        return null;
    }

    return (
        <>
            <TopBarButton onClick={handleEditTitleClick} title="Edit session metadata">
                <Edit fontSize="inherit" />
            </TopBarButton>
            <EditSessionMetadataDialog
                workbench={props.workbench}
                id={activeWorkbenchSession!.getId()}
                title={activeWorkbenchSession!.getMetadata().title}
                description={activeWorkbenchSession!.getMetadata().description ?? ""}
                open={editSessionDialogOpen}
                onClose={() => setEditSessionDialogOpen(false)}
            />
        </>
    );
}

type TitleProps = {
    workbench: Workbench;
};

function Title(props: TitleProps): React.ReactNode {
    const activeSession = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.ACTIVE_SESSION,
    );
    const isSnapshot = usePublishSubscribeTopicValue(activeSession!, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    let content = <SessionTitle workbench={props.workbench} />;

    if (isSnapshot) {
        content = <SnapshotTitle workbench={props.workbench} />;
    }

    return <div className="gap-x-sm flex grow items-center overflow-hidden">{content}</div>;
}

type SnapshotTitleProps = {
    workbench: Workbench;
};

function SnapshotTitle(props: SnapshotTitleProps): React.ReactNode {
    const activeSnapshot = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.ACTIVE_SESSION,
    );
    const metadata = usePublishSubscribeTopicValue(activeSnapshot!, PrivateWorkbenchSessionTopic.METADATA);

    return (
        <>
            <Popover.Root>
                <Popover.Trigger size="small" variant="ghost" iconOnly>
                    <Info style={{ fontSize: 16 }} />
                </Popover.Trigger>
                <Popover.Popup side="bottom">
                    <Popover.Content>
                        <div className="whitespace-normal">
                            <Heading as="h6" variant="strong" weight="bolder">
                                {metadata.title}
                            </Heading>
                            {metadata.description && (
                                <>
                                    <Separator orientation="horizontal" />
                                    <Paragraph size="sm" layoutClassName="whitespace-pre-wrap">
                                        {metadata.description}
                                    </Paragraph>
                                </>
                            )}
                        </div>
                    </Popover.Content>
                </Popover.Popup>
            </Popover.Root>
            <Link fontSize="inherit" className="mr-2xs" />
            <Heading as="h5" layoutClassName="truncate">
                {metadata.title}
            </Heading>
            <Typography family="body" size="sm" as="span">
                (snapshot)
            </Typography>
            <Tooltip content="This session is a snapshot and cannot be edited.">
                <Lock fontSize="inherit" />
            </Tooltip>
        </>
    );
}

type SessionTitleProps = {
    workbench: Workbench;
};

function SessionTitle(props: SessionTitleProps): React.ReactNode {
    const activeSession = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.ACTIVE_SESSION,
    );
    const metadata = usePublishSubscribeTopicValue(activeSession!, PrivateWorkbenchSessionTopic.METADATA);
    const isPersisted = usePublishSubscribeTopicValue(activeSession!, PrivateWorkbenchSessionTopic.IS_PERSISTED);

    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getPersistenceOrchestrator()!,
        PersistenceOrchestratorTopic.PERSISTENCE_INFO,
    );

    const hasChanges = (persistenceInfo.hasChanges && persistenceInfo.lastPersistedMs !== null) || !isPersisted;

    return (
        <>
            <Popover.Root>
                <Popover.Trigger size="small" variant="ghost" iconOnly>
                    <Info style={{ fontSize: 16 }} />
                </Popover.Trigger>
                <Popover.Popup side="bottom">
                    <Popover.Content>
                        <div className="gap-4xs flex flex-col whitespace-normal">
                            <Heading as="h6" variant="strong" weight="bolder">
                                {metadata.title}
                            </Heading>
                            <Separator orientation="horizontal" />
                            <Paragraph
                                size="sm"
                                tone="neutral"
                                layoutClassName="whitespace-pre-wrap"
                                italic={!metadata.description}
                            >
                                {metadata.description ?? "No description provided."}
                            </Paragraph>
                            <Separator orientation="horizontal" />
                            <Typography size="xs" tone="neutral">
                                {isPersisted
                                    ? `Last saved: ${
                                          persistenceInfo.lastPersistedMs
                                              ? new Date(persistenceInfo.lastPersistedMs).toLocaleString()
                                              : "unknown"
                                      }`
                                    : "Not saved yet"}
                            </Typography>
                        </div>
                    </Popover.Content>
                </Popover.Popup>
            </Popover.Root>
            <Heading as="h6" layoutClassName="truncate">
                {metadata.title}
            </Heading>
            <HasChangesIndicator visible={hasChanges} />
        </>
    );
}

type SessionFromSnapshotButtonProps = {
    workbench: Workbench;
};

function SessionFromSnapshotButton(props: SessionFromSnapshotButtonProps): React.ReactNode {
    const handleClick = () => {
        props.workbench.getSessionManager().convertSnapshotToSession();
    };

    return (
        <TopBarButton
            onClick={handleClick}
            title="Make a new session of the current snapshot"
            variant="contained"
            iconOnly={false}
        >
            Make session
        </TopBarButton>
    );
}

type SnapshotButtonProps = {
    workbench: Workbench;
};

function SnapshotButton(props: SnapshotButtonProps): React.ReactNode {
    const setIsOpen = useSetGuiState(props.workbench.getGuiMessageBroker(), GuiState.MakeSnapshotDialogOpen);

    const handleClick = () => {
        setIsOpen(true);
    };

    return (
        <TopBarButton onClick={handleClick} title="Make a snapshot of the current session">
            <AddLink fontSize="small" />
        </TopBarButton>
    );
}

type SessionSaveButtonProps = {
    workbench: Workbench;
};

function SessionSaveButton(props: SessionSaveButtonProps): React.ReactNode {
    const activeSession = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.ACTIVE_SESSION,
    );

    const setSaveSessionDialogOpen = useSetGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SaveSessionDialogOpen,
    );

    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getPersistenceOrchestrator()!,
        PersistenceOrchestratorTopic.PERSISTENCE_INFO,
    );

    const isPersisted = usePublishSubscribeTopicValue(activeSession!, PrivateWorkbenchSessionTopic.IS_PERSISTED);

    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const saveEnabled = persistenceInfo.hasChanges || !isPersisted;

    function handleSaveClick() {
        if (!isPersisted) {
            setSaveSessionDialogOpen(true);
            return;
        }
        // The save button is disabled on new sessions, so the "maybe"
        // is technically unnecessary, but we'll use it for brevity
        props.workbench.getSessionManager().maybeSaveSession();
    }

    function handleSaveAsClick() {
        setSaveSessionDialogOpen(true);
    }

    function handleSaveMenuAction(actionId: string) {
        if (actionId === "save") {
            handleSaveClick();
        } else if (actionId === "save-as") {
            handleSaveAsClick();
        }
    }

    return (
        <Button.Group split>
            <Button variant="contained" tone="accent" disabled={!saveEnabled} onClick={handleSaveClick} iconOnly>
                {isSaving ? (
                    // Margin is explicitly added to make the spinner's position width match the save icon
                    <CircularProgress size={16} layoutClassName="mx-[2px]" />
                ) : (
                    <Save style={{ fontSize: 16 }} />
                )}
            </Button>
            <MenuCompositions.Default
                onActionClicked={handleSaveMenuAction}
                items={[
                    {
                        id: "save",
                        label: "Save session",
                        icon: <Save fontSize="small" />,
                        disabled: !isPersisted || !persistenceInfo.hasChanges,
                    },
                    {
                        id: "save-as",
                        label: "Save session as ...",
                        icon: <SaveAs fontSize="small" />,
                    },
                ]}
            >
                {/* TODO: Pressed state when menu is open */}
                <Button {...props} variant="contained" tone="accent" iconOnly compact>
                    <ArrowDropDown style={{ fontSize: 16 }} />
                </Button>
            </MenuCompositions.Default>
        </Button.Group>
    );
}

type TopBarButtonProps = {
    children?: React.ReactNode;
    active?: boolean;
    title: string;
    onClick?: () => void;
    disabled?: boolean;
} & ButtonProps;

function TopBarButtonComponent(props: TopBarButtonProps, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    const { active, title, onClick, disabled, ...baseProps } = props;
    return (
        <Tooltip content={title} side="bottom">
            {/* ! Workaround required to deal with EDS tooltip overwriting refs */}
            <span>
                <Button
                    ref={ref}
                    variant="ghost"
                    tone="accent"
                    iconOnly
                    pressed={active}
                    onClick={onClick}
                    disabled={disabled}
                    {...baseProps}
                >
                    {props.children}
                </Button>
            </span>
        </Tooltip>
    );
}

export const TopBarButton = React.forwardRef(TopBarButtonComponent);

type RefreshSessionButtonProps = {
    workbench: Workbench;
};

function RefreshSessionButton(props: RefreshSessionButtonProps): React.ReactNode {
    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getPersistenceOrchestrator()!,
        PersistenceOrchestratorTopic.PERSISTENCE_INFO,
    );

    async function handleRefreshClick() {
        await props.workbench.getSessionManager().refreshActiveSessionFromBackend();
    }

    if (
        persistenceInfo.backendLastUpdatedMs === null ||
        persistenceInfo.backendLastUpdatedMs <= (persistenceInfo.lastPersistedMs ?? 0)
    ) {
        return null;
    }

    return (
        <div
            className={
                "gap-xs bg-warning-canvas text-warning-subtle py-2xs px-sm text-body-sm flex items-center rounded"
            }
        >
            Out of sync with server.
            <Button
                onClick={handleRefreshClick}
                title="Reload session from server"
                size="small"
                variant="ghost"
                tone="warning"
                iconOnly
            >
                <Refresh style={{ fontSize: 16 }} />
            </Button>
        </div>
    );
}
