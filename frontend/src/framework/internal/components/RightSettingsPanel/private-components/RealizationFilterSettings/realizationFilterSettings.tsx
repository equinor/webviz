import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
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
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const realizationFilterSet = props.workbench.getWorkbenchSession().getRealizationFilterSet();

    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
    const [activeFilterEnsembleIdent, setActiveFilterEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    const [ensembleIdentStringHasUnsavedChangesMap, setEnsembleIdentStringHasUnsavedChangesMap] = React.useState<{
        [ensembleIdentString: string]: boolean;
    }>({});

    function handleCloseDrawerClick() {
        setDialogOpen(false);
        props.onClose();
        setActiveFilterEnsembleIdent(null);
    }

    function handleDoNotCloseDrawerClick() {
        setDialogOpen(false);
    }

    function handleFilterSettingsClose() {
        // Check if there are unsaved changes
        const hasUnsavedChanges = Object.values(ensembleIdentStringHasUnsavedChangesMap).some(
            (hasUnsavedChanges) => hasUnsavedChanges
        );
        if (hasUnsavedChanges) {
            setDialogOpen(true);
        } else {
            props.onClose();
            setActiveFilterEnsembleIdent(null);
        }
    }

    function handleFilterChange() {
        // Notify subscribers of change.
        props.workbench.getWorkbenchSession().notifyAboutEnsembleRealizationFilterChange();
    }

    function handleFilterEditChange(ensembleIdent: EnsembleIdent, hasUnsavedChanges: boolean) {
        const newMap = { ...ensembleIdentStringHasUnsavedChangesMap };
        const ensembleIdentString = ensembleIdent.toString();
        newMap[ensembleIdentString] = hasUnsavedChanges;
        setEnsembleIdentStringHasUnsavedChangesMap(newMap);
    }

    function handleSetActiveEnsembleRealizationFilter(ensembleIdent: EnsembleIdent) {
        setActiveFilterEnsembleIdent(ensembleIdent);
    }

    function handleOnEnsembleRealizationFilterHeaderClick(ensembleIdent: EnsembleIdent) {
        if (activeFilterEnsembleIdent?.equals(ensembleIdent)) {
            setActiveFilterEnsembleIdent(null);
        }
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
                            const ensembleIdent = ensemble.getIdent();
                            const isActive =
                                activeFilterEnsembleIdent !== null && activeFilterEnsembleIdent.equals(ensembleIdent);
                            const isAnotherActive = !isActive && activeFilterEnsembleIdent !== null;
                            return (
                                <EnsembleRealizationFilter
                                    key={ensembleIdent.toString()}
                                    realizationFilter={realizationFilterSet.getRealizationFilterForEnsembleIdent(
                                        ensemble.getIdent()
                                    )}
                                    isActive={isActive}
                                    isAnotherFilterActive={isAnotherActive}
                                    onClick={() => handleSetActiveEnsembleRealizationFilter(ensembleIdent)}
                                    onHeaderClick={() => handleOnEnsembleRealizationFilterHeaderClick(ensembleIdent)}
                                    onFilterChange={handleFilterChange}
                                    onUnsavedFilterChange={(hasUnsavedChanges) =>
                                        handleFilterEditChange(ensembleIdent, hasUnsavedChanges)
                                    }
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
                                    <Button onClick={handleCloseDrawerClick}>Yes</Button>
                                    <Button onClick={handleDoNotCloseDrawerClick}>No</Button>
                                </div>
                            }
                        >
                            You have unsaved filter changes which are not applied to the ensemble yet. Do you want still
                            want to close the drawer?
                        </Dialog>
                    }
                </div>
            </Drawer>
        </div>
    );
};
