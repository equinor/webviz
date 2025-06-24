import React from "react";

import { Tooltip, Typography } from "@equinor/eds-core-react";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { WorkbenchSessionPersistenceServiceTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionPersistenceService";
import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import type { ButtonProps } from "@lib/components/Button/button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { timeAgo } from "@lib/utils/dates";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close, Edit, Refresh, Save } from "@mui/icons-material";

import FmuLogo from "@assets/fmu.svg";

import { DashboardPreview } from "../DashboardPreview/dashboardPreview";
import { LoginButton } from "../LoginButton";

export type TopBarProps = {
    workbench: Workbench;
};

export function TopBar(props: TopBarProps): React.ReactNode {
    const [saveAsDialogOpen, setSaveAsDialogOpen] = React.useState<boolean>(false);
    const [isSaving, setIsSaving] = React.useState<boolean>(false);

    function handleSaveClick(saveAs: boolean = false) {
        const isPersisted = props.workbench.getWorkbenchSession().getIsPersisted();
        if (!isPersisted && !saveAs) {
            setSaveAsDialogOpen(true);
            return;
        }
        setIsSaving(true);
        props.workbench
            .getWorkbenchSessionPersistenceService()
            .persistSessionState()
            .then(() => {
                setIsSaving(false);
                setSaveAsDialogOpen(false);
            })
            .catch((error) => {
                console.error("Failed to save session:", error);
                // Optionally, you can show an error message here.
            });
    }

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
                        <SessionTitle workbench={props.workbench} onSaveClick={handleSaveClick} />
                        <RefreshSessionButton workbench={props.workbench} />
                        <SessionSaveButton
                            workbench={props.workbench}
                            onSaveClick={handleSaveClick}
                            isSaving={isSaving}
                        />
                    </>
                ) : (
                    <div className="grow" />
                )}
                <LoginButton showText={false} />
            </div>
            {hasActiveSession && (
                <SaveSessionDialog
                    open={saveAsDialogOpen}
                    onClose={() => setSaveAsDialogOpen(false)}
                    workbench={props.workbench}
                    onSaveClick={() => handleSaveClick(true)}
                    isSaving={isSaving}
                />
            )}
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
    onSaveClick: () => void;
};

function SessionTitle(props: SessionTitleProps): React.ReactNode {
    const [closeConfirmDialogOpen, setCloseConfirmDialogOpen] = React.useState<boolean>(false);

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
        if (props.workbench.getWorkbenchSessionPersistenceService().hasChanges()) {
            setCloseConfirmDialogOpen(true);
            return;
        }

        props.workbench.closeCurrentSession();
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

        function handleCancel() {
            setCloseConfirmDialogOpen(false);
        }

        function handleSave() {
            setCloseConfirmDialogOpen(false);
            props.onSaveClick();
        }

        function handleDiscard() {
            setCloseConfirmDialogOpen(false);
            props.workbench.closeCurrentSession();
        }

        return (
            <>
                {content}
                <Tooltip title="Close session" placement="bottom">
                    <IconButton onClick={handleCloseSessionClick} title="Close session">
                        <Close fontSize="inherit" />
                    </IconButton>
                </Tooltip>
                <Dialog
                    open={closeConfirmDialogOpen}
                    modal
                    showCloseCross={false}
                    title="You have unsaved changes"
                    actions={
                        <>
                            <Button onClick={handleCancel} variant="text">
                                Cancel
                            </Button>
                            <Button onClick={handleDiscard} variant="text" color="danger">
                                Discard changes
                            </Button>
                            <Button onClick={handleSave} variant="text" color="success">
                                Save changes
                            </Button>
                        </>
                    }
                >
                    Do you want to save or discard your changes?
                </Dialog>
            </>
        );
    }

    return <div className="grow flex gap-2 overflow-hidden items-center">{makeContent()}</div>;
}

type SessionSaveButtonProps = {
    workbench: Workbench;
    isSaving: boolean;
    onSaveClick: () => void;
};

function SessionSaveButton(props: SessionSaveButtonProps): React.ReactNode {
    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSessionPersistenceService(),
        WorkbenchSessionPersistenceServiceTopic.PERSISTENCE_INFO,
    );

    const handleSaveClick = () => {
        props.onSaveClick();
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
            {props.isSaving ? (
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

type SaveSessionDialogProps = {
    open: boolean;
    onClose: () => void;
    workbench: Workbench;
    isSaving?: boolean;
    onSaveClick: () => void;
};

type SaveSessionDialogInputFeedback = {
    title?: string;
    description?: string;
};

function SaveSessionDialog(props: SaveSessionDialogProps): React.ReactNode {
    const [title, setTitle] = React.useState<string>("");
    const [description, setDescription] = React.useState<string>("");
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
        props.onSaveClick();

        setTitle("");
        setDescription("");
        setInputFeedback({});
    }

    function handleCancel() {
        setTitle("");
        setDescription("");
        setInputFeedback({});
        props.onClose();
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
                    <Button variant="text" disabled={props.isSaving} onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button variant="text" color="success" disabled={props.isSaving} onClick={handleSave}>
                        {props.isSaving && <CircularProgress size="small" />} Save
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
                                autoFocus
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
