import React from "react";

import { GuiEvent, GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { UnsavedChangesAction } from "@framework/types/unsavedChangesAction";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

import { ModuleInstanceLog } from "./private-components/ModuleInstanceLog/moduleInstanceLog";
import { RealizationFilterSettings } from "./private-components/RealizationFilterSettings";

type RightSettingsPanelProps = { workbench: Workbench };

export const RightSettingsPanel: React.FC<RightSettingsPanelProps> = (props) => {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [, setRightSettingsPanelWidth] = useGuiState(guiMessageBroker, GuiState.RightSettingsPanelWidthInPercent);
    const [numberOfUnsavedRealizationFilters] = useGuiState(
        guiMessageBroker,
        GuiState.NumberOfUnsavedRealizationFilters
    );

    function handleOnClose() {
        if (numberOfUnsavedRealizationFilters === 0) {
            setRightSettingsPanelWidth(0);
            return;
        }

        setDialogOpen(true);
    }

    function handleDialogSaveClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Save,
        });
        setDialogOpen(false);
        setRightSettingsPanelWidth(0);
    }

    function handleDialogDiscardClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Discard,
        });
        setDialogOpen(false);
        setRightSettingsPanelWidth(0);
    }

    function handleDialogCloseClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Cancel,
        });
        setDialogOpen(false);
    }

    return (
        <div className="bg-white border-r-2 z-50 flex flex-col w-full h-full">
            <RealizationFilterSettings workbench={props.workbench} onClose={handleOnClose} />
            <ModuleInstanceLog workbench={props.workbench} onClose={handleOnClose} />
            {
                <Dialog
                    open={dialogOpen}
                    onClose={handleDialogCloseClick}
                    title="Unsaved changes - Realization filter"
                    modal={true}
                    showCloseCross={true}
                    actions={
                        <div className="flex gap-4">
                            <Button onClick={handleDialogSaveClick} color="primary">
                                Save
                            </Button>
                            <Button onClick={handleDialogDiscardClick} color="danger">
                                Discard
                            </Button>
                        </div>
                    }
                >
                    You have unsaved realization filter changes which are not applied to their respective ensemble yet.
                    Do you want to save the changes?
                </Dialog>
            }
        </div>
    );
};
