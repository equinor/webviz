import React from "react";

import { Tooltip } from "@equinor/eds-core-react";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/PrivateWorkbenchSession";
import { WorkbenchSessionPersistenceServiceTopic } from "@framework/persistence/WorkbenchSessionPersistenceService";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import type { ButtonProps } from "@lib/components/Button/button";
import { Dialog } from "@lib/components/Dialog";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { timeAgo } from "@lib/utils/dates";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Edit, Refresh, Save } from "@mui/icons-material";

import FmuLogo from "@assets/fmu.svg";

import { LoginButton } from "../LoginButton";

export type TopBarProps = {
    workbench: Workbench;
};

export function TopBar(props: TopBarProps): React.ReactNode {
    return (
        <div className="bg-white p-2 border-b-2 border-slate-200 z-50 shadow-lg flex flex-row gap-12 px-4 pl-6 items-center">
            <LogoWithText />
            <SessionTitle workbench={props.workbench} />
            <RefreshSessionButton workbench={props.workbench} />
            <SessionSaveButton workbench={props.workbench} />
            <LoginButton showText={false} />
        </div>
    );
}

function LogoWithText(): React.ReactNode {
    return (
        <div className="flex flex-row items-center gap-4">
            <img src={FmuLogo} alt="FMU Analysis logo" className="w-8 h-8" />
            <h1 className="text-md text-slate-800">FMU Analysis</h1>
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

    function makeContent() {
        if (!isPersisted) {
            return null;
        }

        return (
            <>
                <h1>{metadata.title}</h1>
                <IconButton onClick={handleEditTitleClick} title="Edit session">
                    <Edit fontSize="inherit" />
                </IconButton>
            </>
        );
    }

    return <div className="grow flex gap-2">{makeContent()}</div>;
}

type SessionSaveButtonProps = {
    workbench: Workbench;
};

function SessionSaveButton(props: SessionSaveButtonProps): React.ReactNode {
    const [saveAsDialogOpen, setSaveAsDialogOpen] = React.useState<boolean>(false);

    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSessionPersistenceService(),
        WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO,
    );

    const isPersisted = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_PERSISTED,
    );

    const handleSaveClick = () => {
        if (!isPersisted) {
            setSaveAsDialogOpen(true);
            return;
        }
    };

    function makeText() {
        if (persistenceInfo.lastPersistedMs === null) {
            return null;
        }

        if (!persistenceInfo.hasChanges) {
            return null;
        }

        return `You have unsaved changes. Last saved: ${timeAgo(Date.now() - persistenceInfo.lastPersistedMs)}`;
    }

    return (
        <div
            className={resolveClassNames("p-2 flex items-center text-sm gap-4", {
                "bg-amber-100": persistenceInfo.hasChanges && persistenceInfo.lastPersistedMs !== null,
            })}
        >
            {makeText()}
            <TopBarButton
                onClick={handleSaveClick}
                title={persistenceInfo.hasChanges ? "Save session" : "No changes to save"}
                disabled={!persistenceInfo.hasChanges}
            >
                <Save className="size-5" />
            </TopBarButton>
            <SaveSessionDialog open={saveAsDialogOpen} onClose={() => setSaveAsDialogOpen(false)} />
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
            <Refresh className="size-5" />
        </TopBarButton>
    );
}

type SaveSessionDialogProps = {
    open: boolean;
    onClose: () => void;
};

function SaveSessionDialog(props: SaveSessionDialogProps): React.ReactNode {
    return (
        <Dialog
            open={props.open}
            onClose={props.onClose}
            title="Save Session"
            modal
            showCloseCross
            actions={
                <>
                    <Button variant="text">Save</Button>
                </>
            }
        >
            <div className="flex flex-col gap-2">
                <Label text="Name">
                    <Input placeholder="Enter session name" type="text" />
                </Label>
                <Label text="Description">
                    <Input placeholder="Enter session description" multiline />
                </Label>
            </div>
        </Dialog>
    );
}
