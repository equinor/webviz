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
import { CircularProgress } from "@lib/components/CircularProgress";
import { DashboardPreview } from "../DashboardPreview/dashboardPreview";

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
    const [isSaving, setIsSaving] = React.useState<boolean>(false);

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
        setIsSaving(true);
        props.workbench
            .getWorkbenchSessionPersistenceService()
            .persistSessionState()
            .then(() => {
                setIsSaving(false);
            })
            .catch((error) => {
                console.error("Failed to save session:", error);
                // Optionally, you can show an error message here.
            });
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
            {isSaving ? (
                <CircularProgress size="small" className="text-amber-600" />
            ) : (
                <TopBarButton
                    onClick={handleSaveClick}
                    title={persistenceInfo.hasChanges ? "Save session" : "No changes to save"}
                    disabled={!persistenceInfo.hasChanges}
                >
                    <Save className="size-5" />
                </TopBarButton>
            )}
            <SaveSessionDialog
                open={saveAsDialogOpen}
                onClose={() => setSaveAsDialogOpen(false)}
                workbench={props.workbench}
            />
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
    workbench: Workbench;
};

type SaveSessionDialogInputFeedback = {
    title?: string;
    description?: string;
};

function SaveSessionDialog(props: SaveSessionDialogProps): React.ReactNode {
    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");
    const [isSaving, setIsSaving] = React.useState<boolean>(false);
    const [inputFeedback, setInputFeedback] = React.useState<SaveSessionDialogInputFeedback>({});

    function handleSave() {
        if (title.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, title: "Title is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, title: undefined }));
        }

        if (description.trim() === "") {
            setInputFeedback((prev) => ({ ...prev, description: "Description is required." }));
            return;
        } else {
            setInputFeedback((prev) => ({ ...prev, description: undefined }));
        }
        const sessionData = { title, description };
        props.workbench.getWorkbenchSession().setMetadata(sessionData);
        setIsSaving(true);
        props.workbench
            .getWorkbenchSessionPersistenceService()
            .persistSessionState()
            .then(() => {
                setIsSaving(false);
                props.onClose();
            });
    }

    const layout = props.workbench.getWorkbenchSession().getActiveDashboard()?.getLayout() || [];

    return (
        <Dialog
            open={props.open}
            onClose={props.onClose}
            title="Save Session"
            modal
            showCloseCross
            actions={
                <>
                    <Button variant="text" disabled={isSaving} onClick={handleSave}>
                        {isSaving && <CircularProgress size="small" />} Save
                    </Button>
                </>
            }
        >
            <div className="flex gap-4 items-center">
                <DashboardPreview height={100} width={100} layout={layout} />
                <div className="flex flex-col gap-2 grow min-w-0">
                    <Label text="Title">
                        <>
                            <Input
                                placeholder="Enter session title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                error={!!inputFeedback.title}
                            />
                            {inputFeedback.title && (
                                <div className="text-red-600 text-sm mt-1">{inputFeedback.title}</div>
                            )}
                        </>
                    </Label>
                    <Label text="Description">
                        <>
                            <Input
                                placeholder="Enter session description"
                                value={description}
                                multiline
                                onChange={(e) => setDescription(e.target.value)}
                                error={!!inputFeedback.description}
                            />
                            {inputFeedback.description && (
                                <div className="text-red-600 text-sm mt-1">{inputFeedback.description}</div>
                            )}
                        </>
                    </Label>
                </div>
            </div>
        </Dialog>
    );
}
