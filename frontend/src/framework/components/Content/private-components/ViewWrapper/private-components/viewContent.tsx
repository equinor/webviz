import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";

type ViewContentProps = {
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
};

export const ViewContent = React.memo((props: ViewContentProps) => {
    const [importState, setImportState] = React.useState<ImportState>(ImportState.NotImported);

    React.useEffect(() => {
        setImportState(props.moduleInstance.getImportState());

        function handleModuleInstanceImportStateChange() {
            setImportState(props.moduleInstance.getImportState());
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToImportStateChange(
            handleModuleInstanceImportStateChange
        );

        return unsubscribeFunc;
    }, []);

    if (importState === ImportState.NotImported) {
        return <div>Not imported</div>;
    }

    if (importState === ImportState.Importing || !props.moduleInstance.isInitialised()) {
        return <div>Loading...</div>;
    }

    if (importState === ImportState.Failed) {
        return (
            <div>
                Module could not be imported. Please check the spelling when registering and initialising the module.
            </div>
        );
    }

    const View = props.moduleInstance.getViewFC();
    return (
        <View
            moduleContext={props.moduleInstance.getContext()}
            workbenchSession={props.workbench.getWorkbenchSession()}
            workbenchServices={props.workbench.getWorkbenchServices()}
        />
    );
});

ViewContent.displayName = "ViewWrapper";
