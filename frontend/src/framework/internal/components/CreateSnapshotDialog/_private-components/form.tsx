import React from "react";

import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH, MIN_TITLE_LENGTH } from "@framework/internal/persistence/constants";
import { PersistenceOrchestratorTopic } from "@framework/internal/persistence/core/PersistenceOrchestrator";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Banner } from "@lib/newComponents/Banner";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { TextArea } from "@lib/newComponents/TextArea";
import { TextInput } from "@lib/newComponents/TextInput";
import { Tooltip } from "@lib/newComponents/Tooltip";
import { Typography } from "@lib/newComponents/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

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

export function Form(props: FormProps): React.ReactNode {
    const activeSession = useActiveSession();

    const isPersisted = usePublishSubscribeTopicValue(activeSession!, PrivateWorkbenchSessionTopic.IS_PERSISTED);

    const persistenceInfo = usePublishSubscribeTopicValue(
        props.workbench.getSessionManager().getPersistenceOrchestrator()!,
        PersistenceOrchestratorTopic.PERSISTENCE_INFO,
    );

    const hasChanges = (persistenceInfo.hasChanges && persistenceInfo.lastPersistedMs !== null) || !isPersisted;

    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle<
        HTMLInputElement | HTMLTextAreaElement | null,
        HTMLInputElement | HTMLTextAreaElement | null
    >(props.titleInputRef, () => inputRef.current);

    const layout = props.workbench.getSessionManager().getActiveSession().getActiveDashboard()?.getLayout() || [];

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
                <Banner tone="warning" layoutClassName="mb-vertical-2xs">
                    There are unsaved changes in the current session. These changes will be included in the snapshot.
                </Banner>
            )}
            <form id={props.id} className="gap-horizontal-sm flex items-center" onSubmit={props.onSubmit}>
                <DashboardPreview height={220} width={150} layout={layout} />
                <div className="gap-vertical-sm flex min-w-0 grow flex-col">
                    <FieldCompositions.Default
                        label="Title"
                        indicator="(Required)"
                        info={`Enter a descriptive title for your snapshot, which will help you identify it later. This must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters.`}
                    >
                        <TextInput
                            minLength={MIN_TITLE_LENGTH}
                            maxLength={MAX_TITLE_LENGTH}
                            ref={inputRef}
                            value={props.title}
                            onValueChange={handleTitleChange}
                            placeholder="Enter snapshot title"
                            autoFocus
                            required
                            endAdornment={
                                <Tooltip
                                    content={`Your title is currently using ${props.title.length} out of the maximum ${MAX_TITLE_LENGTH} characters.`}
                                >
                                    <Typography
                                        size="sm"
                                        family="body"
                                        tone="neutral"
                                    >{`${props.title.length}/${MAX_TITLE_LENGTH}`}</Typography>
                                </Tooltip>
                            }
                        />
                        <FieldCompositions.GenericErrors />
                    </FieldCompositions.Default>
                    <FieldCompositions.Default label="Description" indicator="(Optional)">
                        <TextArea
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            value={props.description}
                            onValueChange={handleDescriptionChange}
                            placeholder="Enter session description"
                            rows={3}
                            bottomAdornment={
                                <Tooltip
                                    content={`Your descriptions is currently using ${props.description.length} out of the maximum ${MAX_DESCRIPTION_LENGTH} characters.`}
                                >
                                    <Typography
                                        size="sm"
                                        family="body"
                                        tone="neutral"
                                    >{`${props.description.length}/${MAX_DESCRIPTION_LENGTH}`}</Typography>
                                </Tooltip>
                            }
                        />
                    </FieldCompositions.Default>
                </div>
            </form>
        </>
    );
}
