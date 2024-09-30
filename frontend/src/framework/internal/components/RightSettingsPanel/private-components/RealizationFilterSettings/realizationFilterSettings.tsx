import React from "react";

import { GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleRealizationFilter } from "@framework/components/EnsembleRealizationFilter";
import { Drawer } from "@framework/internal/components/Drawer";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { FilterAlt } from "@mui/icons-material";

export type RealizationFilterSettingsProps = { workbench: Workbench; onClose: () => void };

export const RealizationFilterSettings: React.FC<RealizationFilterSettingsProps> = (props) => {
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);

    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const realizationFilterSet = props.workbench.getWorkbenchSession().getRealizationFilterSet();

    function handleFilterSettingsClose() {
        props.onClose();
    }

    function handleFilterChange() {
        // Notify subscribers of change.
        props.workbench.getWorkbenchSession().notifyAboutEnsembleRealizationFilterChange();
    }

    return (
        <div className={`w-full ${drawerContent === RightDrawerContent.RealizationFilterSettings ? "h-full" : "h-0"}`}>
            <Drawer
                title="Realization Filter"
                icon={<FilterAlt />}
                visible={drawerContent === RightDrawerContent.RealizationFilterSettings}
                onClose={handleFilterSettingsClose}
            >
                <div className="flex flex-col p-2 gap-4 overflow-y-auto">
                    <div className="flex-grow space-y-4">
                        {ensembleSet.getEnsembleArr().map((ensemble) => {
                            return (
                                <EnsembleRealizationFilter
                                    key={ensemble.getIdent().toString()}
                                    realizationFilter={realizationFilterSet.getRealizationFilterForEnsembleIdent(
                                        ensemble.getIdent()
                                    )}
                                    active={true}
                                    onFilterChange={handleFilterChange}
                                />
                            );
                        })}
                    </div>
                    {
                        <Dialog
                            open={dialogOpen}
                            onClose={() => setDialogOpen(false)}
                            title="Unsaved changes"
                            modal
                            actions={
                                <div className="flex gap-4">
                                    <Button onClick={() => {}} color="danger">
                                        No, don&apos;t save
                                    </Button>
                                    <Button onClick={() => {}}>Yes, save</Button>
                                </div>
                            }
                        >
                            You have unsaved changes which will be lost. Do you want to save changes?
                        </Dialog>
                    }
                </div>
            </Drawer>
        </div>
    );
};
