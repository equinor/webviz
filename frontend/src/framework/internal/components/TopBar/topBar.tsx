import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { category } from "@equinor/eds-icons";
import { Dropdown, MenuButton } from "@mui/base";
import {
    AddLink,
    ArrowDropDown,
    Close,
    DarkMode,
    DensityMedium,
    DensitySmall,
    Edit,
    Fullscreen,
    FullscreenExit,
    LightMode,
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
import { Button } from "@lib/components/Button";
import type { ButtonProps } from "@lib/components/Button/button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { HasChangesIndicator } from "@lib/components/HasChangesIndicator/hasChangesIndicator";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { Tooltip } from "@lib/components/Tooltip";
import { Heading } from "@lib/newComponents/Heading";
import { Separator } from "@lib/newComponents/Separator";
import { Typography } from "@lib/newComponents/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { EditSessionMetadataDialog } from "../EditSessionMetadataDialog";
import { LoginButton } from "../LoginButton";

export type TopBarProps = {
    workbench: Workbench;
};

Icon.add({ category });

function getMainDataAttribute(attributeName: string) {
    const htmlElement = document.querySelector<HTMLHtmlElement>("html");
    console.debug(htmlElement?.getAttribute(`data-${attributeName}`));
    return htmlElement ? htmlElement.getAttribute(`data-${attributeName}`) : null;
}

function setMainDataAttribute(attributeName: string, value: string) {
    const htmlElement = document.querySelector<HTMLHtmlElement>("html");
    if (htmlElement) {
        htmlElement.setAttribute(`data-${attributeName}`, value);
    }
}

export function TopBar(props: TopBarProps): React.ReactNode {
    const [colorScheme, setColorScheme] = React.useState<string | null>(getMainDataAttribute("color-scheme"));
    const [density, setDensity] = React.useState<string | null>(getMainDataAttribute("density"));

    const hasActiveSession = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION,
    );

    const toggleDarkMode = React.useCallback(function toggleDarkMode() {
        const currentScheme = getMainDataAttribute("color-scheme");
        const newScheme = currentScheme === "dark" ? "light" : "dark";
        setMainDataAttribute("color-scheme", newScheme);
        setColorScheme(newScheme);
    }, []);

    const toggleDenseMode = React.useCallback(function toggleDenseMode() {
        const currentDensity = getMainDataAttribute("density");
        const newDensity = currentDensity === "comfortable" ? "spacious" : "comfortable";
        setMainDataAttribute("density", newDensity);
        setDensity(newDensity);
    }, []);

    return (
        <>
            <div
                className={resolveClassNames(
                    "border-neutral-subtle shadow-elevation-raised z-sticky gap-vertical-3xl py-vertical-3xs px-vertical-xs flex flex-row items-center border-b-2",
                    {
                        "bg-surface": hasActiveSession,
                        "bg-transparent": !hasActiveSession,
                    },
                )}
            >
                <LogoWithText />
                <div className="gap-vertical-md flex min-w-0 grow items-center">
                    {hasActiveSession ? (
                        <>
                            <Title workbench={props.workbench} />
                            <TopBarButtons workbench={props.workbench} />
                        </>
                    ) : (
                        <div className="grow" />
                    )}
                    <Separator orientation="vertical" />
                    <Button variant="text" tone="accent" iconOnly onClick={toggleDarkMode}>
                        {colorScheme === "dark" ? <LightMode fontSize="inherit" /> : <DarkMode fontSize="inherit" />}
                    </Button>
                    <Button variant="text" tone="accent" iconOnly onClick={toggleDenseMode}>
                        {density === "comfortable" ? (
                            <DensityMedium fontSize="inherit" />
                        ) : (
                            <DensitySmall fontSize="inherit" />
                        )}
                    </Button>
                    <LoginButton showText={false} />
                </div>
            </div>
        </>
    );
}
function LogoWithText(): React.ReactNode {
    return (
        <div className="flex flex-row items-center gap-4">
            <FmuLogo className="h-8 w-8" />
            <h1 className="text-md text-accent whitespace-nowrap">FMU Analysis</h1>
            <div
                className="bg-warning-strong text-neutral-strong-on-emphasis text-body-sm cursor-help rounded-sm p-1 text-center"
                title="NOTE: This application is still under heavy development and bugs are to be expected. Please help us improve Webviz by reporting any undesired behaviour either on Slack or Yammer."
            >
                BETA
            </div>
        </div>
    );
}

type TopBarButtonsProps = {
    workbench: Workbench;
};

function TopBarButtons(props: TopBarButtonsProps): React.ReactNode {
    const [isFullscreen, toggleFullScreen] = useBrowserFullscreen();
    const isSnapshot = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getActiveSession(),
        PrivateWorkbenchSessionTopic.IS_SNAPSHOT,
    );

    function handleCloseSessionClick() {
        props.workbench.getSessionManager().maybeCloseCurrentSession();
    }

    const fullscreenButtonTitle = isFullscreen ? "Exit fullscreen (F11)" : "Enter fullscreen (F11)";
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
                    <Separator orientation="vertical" />
                </>
            )}
            <Tooltip title={fullscreenButtonTitle} placement="bottom">
                <TopBarButton title={fullscreenButtonTitle} onClick={toggleFullScreen}>
                    {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
                </TopBarButton>
            </Tooltip>
            <Tooltip title={closeButtonTitle} placement="bottom">
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

    return <div className="flex grow items-center gap-2 overflow-hidden">{content}</div>;
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
            <Link fontSize="inherit" className="mr-1" />
            <Tooltip
                title={
                    <div className="text-base whitespace-normal">
                        <h3 className="text-lg">{metadata.title}</h3>
                        {metadata.description && (
                            <>
                                <hr className="mb-2 h-px bg-white/25" />
                                <p className="text-sm whitespace-pre-wrap">{metadata.description}</p>
                            </>
                        )}
                    </div>
                }
                placement="bottom"
                enterDelay="medium"
            >
                <Heading as="h5">{metadata.title}</Heading>
            </Tooltip>
            <Typography family="body" size="sm" as="span">
                (snapshot)
            </Typography>
            <Tooltip title="This session is a snapshot and cannot be edited.">
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
            <Heading as="h6" italic={!isPersisted}>
                <Tooltip
                    title={
                        <div className="text-base whitespace-normal">
                            <h3 className="text-lg">{metadata.title}</h3>
                            {metadata.description && (
                                <>
                                    <hr className="mb-2 h-px bg-white/25" />
                                    <p className="text-sm whitespace-pre-wrap">{metadata.description}</p>
                                </>
                            )}
                        </div>
                    }
                    placement="bottom"
                    enterDelay="medium"
                >
                    <span className="truncate">{metadata.title}</span>
                </Tooltip>
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
        <div className="flex items-center gap-4 p-2 text-sm">
            <TopBarButton onClick={handleClick} title="Make a new session of the current snapshot" variant="contained">
                Make session
            </TopBarButton>
        </div>
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
        <div className="flex items-center gap-4 p-2 text-sm">
            <TopBarButton onClick={handleClick} title="Make a snapshot of the current session">
                <AddLink fontSize="small" />
            </TopBarButton>
        </div>
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

    const handleSaveClick = () => {
        // The save button is disabled on new sessions, so the "maybe"
        // is technically unnecessary, but we'll use it for brevity
        props.workbench.getSessionManager().maybeSaveSession();
    };

    const handleSaveAsClick = () => {
        setSaveSessionDialogOpen(true);
    };

    const saveEnabled = persistenceInfo.hasChanges && isPersisted;

    return (
        <div className={resolveClassNames("flex w-14 items-center justify-center gap-4 p-2 text-sm")}>
            {isSaving ? (
                <CircularProgress size="medium-small" className="text-amber-600" />
            ) : (
                <Dropdown>
                    <Tooltip title="Save session options">
                        <MenuButton className="flex items-center gap-2 rounded-md p-2 font-medium hover:bg-indigo-100">
                            <Save fontSize="small" />
                            <ArrowDropDown fontSize="small" />
                        </MenuButton>
                    </Tooltip>
                    <Menu anchorOrigin="bottom-start">
                        <MenuItem onClick={handleSaveClick} disabled={!saveEnabled}>
                            <Save fontSize="small" className="mr-2" />
                            Save session
                        </MenuItem>
                        <MenuItem onClick={handleSaveAsClick}>
                            <SaveAs fontSize="small" className="mr-2" />
                            Save session as ...
                        </MenuItem>
                    </Menu>
                </Dropdown>
            )}
        </div>
    );
}

type TopBarButtonProps = {
    children?: React.ReactNode;
    active?: boolean;
    title: string;
    onClick?: () => void;
    disabled?: boolean;
} & ButtonProps;

function TopBarButtonComponent(props: TopBarButtonProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const { active, title, onClick, disabled, ...baseProps } = props;
    return (
        <Tooltip title={title} placement="bottom">
            <Button {...baseProps} ref={ref} variant="text" tone="accent" onClick={onClick} disabled={disabled}>
                {props.children}
            </Button>
        </Tooltip>
    );
}

const TopBarButton = React.forwardRef(TopBarButtonComponent);

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
        <div className={"flex items-center gap-4 bg-amber-100 p-1 px-3 text-sm"}>
            Out of sync with server.
            <TopBarButton onClick={handleRefreshClick} title="Reload session from server">
                <Refresh fontSize="small" />
            </TopBarButton>
        </div>
    );
}
