import React from "react";

import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import { PersistenceOrchestratorTopic } from "@framework/internal/persistence/core/PersistenceOrchestrator";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { CharLimitedInput } from "@lib/components/CharLimitedInput/charLimitedInput";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { truncateString } from "@lib/utils/strings";

import { useActiveSession } from "../../ActiveSessionBoundary";
import { DashboardPreview } from "../../DashboardPreview/dashboardPreview";

export type FormProps = {
    id: string;
    workbench: Workbench;
    title: string;
    description: string;
    setTitle: (title: string) => void;
    setDescription: (description: string) => void;
    titleInputRef: React.ForwardedRef<HTMLInputElement>;
    onSubmit: React.FormEventHandler<HTMLFormElement>;
};

type MakeSnapshotDialogInputFeedback = {
    title?: string;
};

export function Form(props: FormProps): React.ReactNode {
    const { setTitle, setDescription } = props;

    const activeSession = useActiveSession();

    const isPersisted = usePublishSubscribeTopicValue(activeSession!, PrivateWorkbenchSessionTopic.IS_PERSISTED);

    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getPersistenceOrchestrator()!,
        PersistenceOrchestratorTopic.PERSISTENCE_INFO,
    );

    const hasChanges = (persistenceInfo.hasChanges && persistenceInfo.lastPersistedMs !== null) || !isPersisted;

    const originalTitle = activeSession.getMetadata().title;
    const originalDescription = activeSession.getMetadata().description ?? "";

    React.useEffect(
        function propagateTitleChange() {
            setTitle(`Snapshot: ${truncateString(originalTitle, MAX_TITLE_LENGTH)}`);
        },
        [originalTitle, setTitle],
    );

    React.useEffect(
        function propagateDescriptionChange() {
            setDescription(originalDescription);
        },
        [originalDescription, setDescription],
    );

    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle<
        HTMLInputElement | HTMLTextAreaElement | null,
        HTMLInputElement | HTMLTextAreaElement | null
    >(props.titleInputRef, () => inputRef.current);

    const layout = props.workbench.getSessionManager().getActiveSession().getActiveDashboard()?.getLayout() || [];

    const inputFeedback: MakeSnapshotDialogInputFeedback = React.useMemo(() => {
        const feedback: MakeSnapshotDialogInputFeedback = {};
        if (props.title.trim() === "") {
            feedback.title = "Title is required.";
        }
        return feedback;
    }, [props.title]);

    React.useEffect(function focusInput() {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    function handleTitleChange(newTitle: string) {
        props.setTitle(newTitle);
    }

    function handleDescriptionChange(newDescription: string) {
        props.setDescription(newDescription);
    }

    return (
        <>
            {hasChanges && (
                <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-sm">
                    There are unsaved changes in the current session. These changes will be included in the snapshot.
                </div>
            )}
            <form id={props.id} className="flex gap-4 items-center" onSubmit={props.onSubmit}>
                <DashboardPreview height={100} width={100} layout={layout} />
                <div className="flex flex-col gap-2 grow min-w-0">
                    <CharLimitedInput
                        label="Title"
                        onControlledValueChange={handleTitleChange}
                        maxLength={MAX_TITLE_LENGTH}
                        inputRef={inputRef}
                        placeholder="Enter snapshot title"
                        type="text"
                        value={props.title}
                        error={!!inputFeedback.title}
                        autoFocus
                        required
                    />
                    <div className="text-red-600 text-sm mb-1 h-4">{inputFeedback.title}</div>
                    <CharLimitedInput
                        label="Description (optional)"
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        onControlledValueChange={handleDescriptionChange}
                        placeholder="Enter snapshot description"
                        value={props.description}
                        multiline
                    />
                </div>
            </form>
        </>
    );
}
