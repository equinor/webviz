import React from "react";

import { Tooltip, Typography } from "@equinor/eds-core-react";
import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { WorkbenchSessionPersistenceServiceTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionPersistenceService";
import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import type { ButtonProps } from "@lib/components/Button/button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { IconButton } from "@lib/components/IconButton";
import { timeAgo } from "@lib/utils/dates";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close, Edit, Refresh, Save } from "@mui/icons-material";

import FmuLogo from "@assets/fmu.svg";

import { LoginButton } from "../LoginButton";

export type TopBarProps = {
    workbench: Workbench;
};

export function TopBar(props: TopBarProps): React.ReactNode {
    const hasActiveSession = usePublishSubscribeTopicValue(props.workbench, WorkbenchTopic.HAS_ACTIVE_SESSION);
    return (
        <>
            <div
                className={resolveClassNames(
                    "p-2 border-b-2 border-slate-200 z-50 shadow-lg flex flex-row gap-12 px-4 pl-6 items-center",
                    {
                        "bg-white": hasActiveSession,
                        "bg-transparent": !hasActiveSession,
                    },
                )}
            >
                <LogoWithText />
                {hasActiveSession ? (
                    <>
                        <SessionTitle workbench={props.workbench} />
                        <RefreshSessionButton workbench={props.workbench} />
                        <SessionSaveButton workbench={props.workbench} />
                    </>
                ) : (
                    <div className="grow" />
                )}
                <LoginButton showText={false} />
            </div>
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

    function handleEditTitleClick() {
        alert("Edit title functionality is not implemented yet.");
    }

    function handleCloseSessionClick() {
        props.workbench.maybeCloseCurrentSession();
    }

    function makeContent() {
        let content: React.ReactNode = null;
        if (!isPersisted) {
            content = (
                <Typography variant="h4" className="italic overflow-ellipsis min-w-0 whitespace-nowrap">
                    {metadata.title}
                </Typography>
            );
        } else {
            content = (
                <>
                    <Typography variant="h4" className="overflow-ellipsis min-w-0 whitespace-nowrap">
                        {metadata.title}
                    </Typography>
                    <Tooltip title="Edit session" placement="bottom">
                        <IconButton onClick={handleEditTitleClick} title="Edit session">
                            <Edit fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </>
            );
        }

        return (
            <>
                {content}
                <Tooltip title="Close session" placement="bottom">
                    <IconButton onClick={handleCloseSessionClick} title="Close session">
                        <Close fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </>
        );
    }

    return <div className="grow flex gap-2 overflow-hidden items-center">{makeContent()}</div>;
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

    function makeText() {
        if (persistenceInfo.lastPersistedMs === null) {
            return null;
        }

        if (!persistenceInfo.hasChanges) {
            return null;
        }

        if (!isPersisted) {
            return null;
        }

        return `You have unsaved changes. Last saved: ${timeAgo(Date.now() - persistenceInfo.lastPersistedMs)}`;
    }

    return (
        <div
            className={resolveClassNames("p-2 flex items-center text-sm gap-4", {
                "bg-amber-100": persistenceInfo.hasChanges && persistenceInfo.lastPersistedMs !== null && isPersisted,
            })}
        >
            {makeText()}
            {isSaving ? (
                <CircularProgress size="small" className="text-amber-600" />
            ) : (
                <TopBarButton
                    onClick={handleSaveClick}
                    title={persistenceInfo.hasChanges ? "Save session" : "No changes to save"}
                    disabled={!persistenceInfo.hasChanges}
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
                className={resolveClassNames(
                    "w-full h-10 text-center px-3!",
                    active ? "text-cyan-600" : "text-slate-800!",
                )}
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
    const handleRefreshClick = () => {
        alert("Refresh session functionality is not implemented yet.");
    };

    return (
        <TopBarButton onClick={handleRefreshClick} title="Refresh session">
            <Refresh fontSize="small" />
        </TopBarButton>
    );
}
