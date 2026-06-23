import React from "react";

import {
    GuiEvent,
    GuiState,
    RightDrawerContent,
    useGuiValue,
    useRegisterGuiEventSubscriber,
    useSetGuiState,
} from "@framework/GuiMessageBroker";
import { UnsavedChangesAction } from "@framework/types/unsavedChangesAction";
import type { Workbench } from "@framework/Workbench";
import { AlertDialog } from "@lib/newComponents/AlertDialog";
import { ContentHidden } from "@lib/newComponents/Hidden";

import { ModulesList } from "../ModulesList";

import { ColorPaletteSettings } from "./private-components/colorPaletteSettings";
import { ModuleInstanceLog } from "./private-components/moduleInstanceLog";
import { RealizationFilterSettings } from "./private-components/realizationFilterSettings";

type RightSettingsPanelProps = { workbench: Workbench };

export const RightSettingsPanel = React.memo(function RightSettingsPanel(props: RightSettingsPanelProps) {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

    const drawerContent = useGuiValue(guiMessageBroker, GuiState.RightDrawerContent);
    const setRightDrawerContent = useSetGuiState(guiMessageBroker, GuiState.RightDrawerContent);
    const setRightSettingsPanelWidth = useSetGuiState(guiMessageBroker, GuiState.RightSettingsPanelWidthInPercent);
    const numberOfUnsavedRealizationFilters = useGuiValue(guiMessageBroker, GuiState.NumberOfUnsavedRealizationFilters);

    const handleOnClose = React.useCallback(
        function handleOnClose() {
            console.debug("Request to close right settings panel received");
            if (numberOfUnsavedRealizationFilters !== 0) {
                setDialogOpen(true);
                return;
            }

            setRightSettingsPanelWidth(0);
            setRightDrawerContent(undefined);
        },
        [numberOfUnsavedRealizationFilters, setRightSettingsPanelWidth, setRightDrawerContent],
    );

    // Register onClose handler to GuiEvent
    useRegisterGuiEventSubscriber(guiMessageBroker, GuiEvent.RequestRightSettingsPanelClose, handleOnClose);

    function handleDialogSaveClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Save,
        });
        setDialogOpen(false);
        setRightSettingsPanelWidth(0);
        setRightDrawerContent(undefined);
    }

    function handleDialogDiscardClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Discard,
        });
        setDialogOpen(false);
        setRightSettingsPanelWidth(0);
        setRightDrawerContent(undefined);
    }

    function handleDialogCloseClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Cancel,
        });
        setDialogOpen(false);
    }

    return (
        <div className="bg-surface flex h-full w-full flex-col">
            <ContentHidden hidden={drawerContent !== RightDrawerContent.ModulesList}>
                <ModulesList workbench={props.workbench} onClose={handleOnClose} />
            </ContentHidden>
            <ContentHidden hidden={drawerContent !== RightDrawerContent.RealizationFilterSettings}>
                <RealizationFilterSettings workbench={props.workbench} onClose={handleOnClose} />
            </ContentHidden>
            <ContentHidden hidden={drawerContent !== RightDrawerContent.ModuleInstanceLog}>
                <ModuleInstanceLog workbench={props.workbench} onClose={handleOnClose} />
            </ContentHidden>
            <ContentHidden hidden={drawerContent !== RightDrawerContent.ColorPaletteSettings}>
                <ColorPaletteSettings workbench={props.workbench} onClose={handleOnClose} />
            </ContentHidden>
            <AlertDialog
                open={dialogOpen}
                onOpenChange={handleDialogCloseClick}
                title="Unsaved changes - Realization filter"
                primaryAction={{
                    label: "Cancel",
                    onClick: handleDialogCloseClick,
                    tone: "accent",
                }}
                secondaryActions={[
                    {
                        label: "Discard changes",
                        onClick: handleDialogDiscardClick,
                        tone: "danger",
                    },
                    {
                        label: "Save changes",
                        onClick: handleDialogSaveClick,
                        tone: "accent",
                    },
                ]}
            >
                You have unsaved realization filter changes which are not applied to their respective ensemble yet. Do
                you want to save the changes?
            </AlertDialog>
        </div>
    );
});
