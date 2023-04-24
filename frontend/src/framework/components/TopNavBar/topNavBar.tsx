import React from "react";

import { useStoreState } from "@framework/StateStore";
import { useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { ToggleButton } from "@lib/components/ToggleButton";
import { UseQueryResult } from "@tanstack/react-query";

import { EnsembleSelector } from "../EnsembleSelector";
import { LoginButton } from "../LoginButton";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const [modulesListOpen, setModulesListOpen] = useStoreState(props.workbench.getGuiStateStore(), "modulesListOpen");
    const [groupModulesOpen, setGroupModulesOpen] = useStoreState(
        props.workbench.getGuiStateStore(),
        "groupModulesOpen"
    );
    const selectedEnsembles = useStoreValue(props.workbench.getDataStateStore(), "selectedEnsembles");

    const handleToggleModulesList = (value: boolean) => {
        setModulesListOpen(value);
    };

    const handleToggleGroupModules = (value: boolean) => {
        setGroupModulesOpen(value);
    };

    let ensembleButtonText = "Select ensembles";
    if (selectedEnsembles.length > 0) {
        ensembleButtonText = `${selectedEnsembles[0].caseName} - ${selectedEnsembles[0].ensembleName}`;
        if (selectedEnsembles.length > 1) {
            ensembleButtonText += ` and ${selectedEnsembles.length - 1} more`;
        }
    }

    return (
        <div className="bg-slate-100 p-4">
            <div className="flex flex-row gap-4 items-center">
                <h1 className="flex-grow">{activeModuleName}</h1>
                <Button onClick={() => setEnsembleDialogOpen(true)}>{ensembleButtonText}</Button>
                <ToggleButton active={modulesListOpen} onToggle={(active: boolean) => handleToggleModulesList(active)}>
                    Add modules
                </ToggleButton>
                <ToggleButton
                    active={groupModulesOpen}
                    onToggle={(active: boolean) => handleToggleGroupModules(active)}
                >
                    Group modules
                </ToggleButton>
                <LoginButton />
            </div>
            <Dialog
                open={ensembleDialogOpen}
                onClose={() => setEnsembleDialogOpen(false)}
                title="Select ensembles"
                modal
                width={"75%"}
                actions={
                    <div className="flex gap-4">
                        <Button onClick={() => setEnsembleDialogOpen(false)}>OK</Button>
                    </div>
                }
            >
                <EnsembleSelector workbench={props.workbench} />
            </Dialog>
        </div>
    );
};

function makeQueriesDbgString(fields: UseQueryResult, cases: UseQueryResult, ens: UseQueryResult): string {
    let s = "";
    s += `  fields: ${fields.status.slice(0, 4)}/${fields.fetchStatus.slice(0, 4)} - data=${fields.data ? "Y" : "N"}`;
    s += `  cases: ${cases.status.slice(0, 4)}/${cases.fetchStatus.slice(0, 4)} - data=${cases.data ? "Y" : "N"}`;
    s += `  ensembles: ${ens.status.slice(0, 4)}/${ens.fetchStatus.slice(0, 4)} - data=${ens.data ? "Y" : "N"}`;
    return s;
}
