import React from "react";

import { Icon, Tooltip, Typography } from "@equinor/eds-core-react";
import { category } from "@equinor/eds-icons";
import { AddLink, Category, Close, Edit, Link, Lock, Refresh, Save } from "@mui/icons-material";

import FmuLogo from "@assets/fmu.svg";

import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { WorkbenchSessionPersistenceServiceTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionPersistenceService";
import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import type { ButtonProps } from "@lib/components/Button/button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { LoginButton } from "../LoginButton";

export type TopBarProps = {
    workbench: Workbench;
};

Icon.add({ category });

export function TopBar(props: TopBarProps): React.ReactNode {
    const hasActiveSession = usePublishSubscribeTopicValue(props.workbench, WorkbenchTopic.HAS_ACTIVE_SESSION);

    return (
        <>
            <div
                className={resolveClassNames(
                    "p-0.5 border-b-2 border-slate-200 z-50 shadow-lg flex flex-row gap-12 px-4 pl-6 items-center min-h-16",
                    {
                        "bg-white": hasActiveSession,
                        "bg-transparent": !hasActiveSession,
                    },
                )}
            >
                <LogoWithText />
                <div className="flex gap-2 items-center grow">
                    {hasActiveSession ? (
                        <>
                            <SessionTitle workbench={props.workbench} />
                            <TopBarButtons workbench={props.workbench} />
                        </>
                    ) : (
                        <div className="grow" />
                    )}
                    <TopBarDivider />
                    <LoginButton showText={false} />
                </div>
            </div>
        </>
    );
}

type TopBarButtonsProps = {
    workbench: Workbench;
};

function TopBarButtons(props: TopBarButtonsProps): React.ReactNode {
    const isSnapshot = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_SNAPSHOT,
    );

    function handleCloseSessionClick() {
        props.workbench.maybeCloseCurrentSession();
    }

    const closeButtonTitle = isSnapshot ? "Close snapshot" : "Close session";

    return (
        <>
            {isSnapshot ? (
                <SessionFromSnapshotButton workbench={props.workbench} />
            ) : (
                <>
                    <EditSessionButton workbench={props.workbench} />
                    <TopBarDivider />
                    <RefreshSessionButton workbench={props.workbench} />
                    <SessionSaveButton workbench={props.workbench} />
                    <SnapshotButton workbench={props.workbench} />
                    <TopBarDivider />
                </>
            )}
            <Tooltip title={closeButtonTitle} placement="bottom">
                <TopBarButton onClick={handleCloseSessionClick} title={closeButtonTitle}>
                    <Close fontSize="inherit" />
                </TopBarButton>
            </Tooltip>
        </>
    );
}

function LogoWithText(): React.ReactNode {
    return (
        <div className="flex flex-row items-center gap-4">
            <img src={FmuLogo} alt="FMU Analysis logo" className="w-8 h-8" />
            <h1 className="text-md text-slate-800 whitespace-nowrap">FMU Analysis</h1>
            <div
                className="bg-orange-600 text-white p-1 rounded-sm text-xs text-center cursor-help shadow-sm"
                title="NOTE: This application is still under heavy development and bugs are to be expected. Please help us improve Webviz by reporting any undesired behaviour either on Slack or Yammer."
            >
                BETA
            </div>
        </div>
    );
}

type EditSessionButtonProps = {
    workbench: Workbench;
};

function EditSessionButton(props: EditSessionButtonProps): React.ReactNode {
    const isPersisted = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_PERSISTED,
    );

    const isSnapshot = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_SNAPSHOT,
    );

    const [, setEditSessionDialogOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.EditSessionDialogOpen,
    );

    function handleEditTitleClick() {
        setEditSessionDialogOpen(true);
    }

    if (isSnapshot || !isPersisted) {
        return null;
    }

    return (
        <TopBarButton onClick={handleEditTitleClick} title="Edit session">
            <Edit fontSize="inherit" />
        </TopBarButton>
    );
}

type SessionTitleProps = {
    workbench: Workbench;
};

function SessionTitle(props: SessionTitleProps): React.ReactNode {
    const metadata = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.METADATA,
    );

    const isPersisted = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_PERSISTED,
    );

    const isSnapshot = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_SNAPSHOT,
    );

    function handleEditTitleClick() {
        // props.workbench.editSession();
    }

    function handleCloseSessionClick() {
        props.workbench.maybeCloseCurrentSession();
    }

    function makeContent() {
        let content: React.ReactNode = null;
        if (isSnapshot) {
            content = (
                <>
                    <Link fontSize="inherit" className="mr-1" />
                    <Tooltip
                        title={
                            <>
                                <h6>{metadata.title}</h6>
                                <p>
                                    <Typography variant="body_short">
                                        {new Date(metadata.createdAt).toLocaleString()}
                                    </Typography>
                                </p>
                                <p>{metadata.description ?? "No description provided."}</p>
                            </>
                        }
                        placement="bottom"
                    >
                        <Typography variant="h5" className="overflow-ellipsis min-w-0 whitespace-nowrap">
                            {metadata.title}
                        </Typography>
                    </Tooltip>
                    <Typography variant="body_short" className="overflow-ellipsis min-w-0 whitespace-nowrap font-light">
                        (snapshot)
                    </Typography>
                    <Tooltip title="This session is a snapshot and cannot be edited.">
                        <Lock fontSize="inherit" />
                    </Tooltip>
                </>
            );
        } else {
            content = (
                <>
                    <Category fontSize="inherit" className="mr-1" />
                    <Typography
                        variant="h5"
                        className={resolveClassNames("overflow-ellipsis min-w-0 whitespace-nowrap", {
                            italic: !isPersisted,
                        })}
                    >
                        {metadata.title}
                    </Typography>
                </>
            );
        }

        return <>{content}</>;
    }

    return <div className="grow flex gap-2 overflow-hidden items-center">{makeContent()}</div>;
}

type SessionFromSnapshotButtonProps = {
    workbench: Workbench;
};

function SessionFromSnapshotButton(props: SessionFromSnapshotButtonProps): React.ReactNode {
    const handleClick = () => {
        props.workbench.makeSessionFromSnapshot();
    };

    return (
        <div className="p-2 flex items-center text-sm gap-4">
            <TopBarButton onClick={handleClick} title="Make a snapshot of the current session" variant="contained">
                Create new session from snapshot
            </TopBarButton>
        </div>
    );
}

type SnapshotButtonProps = {
    workbench: Workbench;
};

function SnapshotButton(props: SnapshotButtonProps): React.ReactNode {
    const [, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.MakeSnapshotDialogOpen);

    const handleClick = () => {
        setIsOpen(true);
    };

    return (
        <div className="p-2 flex items-center text-sm gap-4">
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
    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSessionPersistenceService(),
        WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO,
    );

    const isPersisted = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_PERSISTED,
    );

    const isSaving = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsSavingSession);

    const handleSaveClick = () => {
        props.workbench.saveCurrentSession();
    };

    const enabled = persistenceInfo.hasChanges || !isPersisted;

    return (
        <div
            className={resolveClassNames("p-2 flex items-center justify-center text-sm gap-4 w-14", {
                "bg-amber-100": persistenceInfo.hasChanges && persistenceInfo.lastPersistedMs !== null && isPersisted,
            })}
        >
            {isSaving ? (
                <CircularProgress size="medium-small" className="text-amber-600" />
            ) : (
                <TopBarButton
                    onClick={handleSaveClick}
                    title={enabled ? "Save session" : "No changes to save"}
                    disabled={!enabled}
                >
                    <Save fontSize="small" />
                </TopBarButton>
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
            <Button
                {...baseProps}
                ref={ref}
                className={resolveClassNames("w-full h-10 text-center px-3!", {
                    "text-cyan-600": active,
                    "!text-slate-800": props.variant === "text" || props.variant === undefined,
                })}
                title={title}
                onClick={onClick}
                disabled={disabled}
            >
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
        props.workbench.getWorkbenchSessionPersistenceService(),
        WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO,
    );

    function handleRefreshClick() {
        props.workbench.maybeRefreshSession();
    }

    if (
        persistenceInfo.backendLastUpdatedMs === null ||
        persistenceInfo.backendLastUpdatedMs <= (persistenceInfo.lastPersistedMs ?? 0)
    ) {
        return null;
    }

    return (
        <div className={"p-1 px-3 flex items-center text-sm gap-4 bg-amber-100"}>
            Out of sync with server.
            <TopBarButton onClick={handleRefreshClick} title="Reload session from server">
                <Refresh fontSize="small" />
            </TopBarButton>
        </div>
    );
}

function TopBarDivider(): React.ReactNode {
    return <div className="bg-slate-200 w-px h-10 mx-2" />;
}
