import React from "react";

import { ImportState } from "@/core/framework/Module";
import { ModuleInstance } from "@/core/framework/ModuleInstance";
import { Workbench } from "@/core/framework/Workbench";

// import { useWorkbenchActiveModuleId } from "@/core/hooks/useWorkbenchActiveModuleId";

type ViewWrapperProps = {
    isActive: boolean;
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
};

export const ViewWrapper: React.FC<ViewWrapperProps> = (props) => {
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

    const createContent = React.useCallback(
        function createContent(): React.ReactElement {
            if (importState === ImportState.NotImported) {
                return <div>Not imported</div>;
            }

            if (importState === ImportState.Importing) {
                return <div>Loading...</div>;
            }

            if (importState === ImportState.Failed) {
                return <div>Failed</div>;
            }

            const View = props.moduleInstance.getViewFC();
            return (
                <View
                    moduleContext={props.moduleInstance.getOrCreateContext()}
                    workbenchServices={props.workbench.getWorkbenchServices()}
                />
            );
        },
        [props.moduleInstance, props.workbench, importState]
    );

    return (
        <div
            className={`bg-white p-4 ${props.isActive ? "border-red-600" : ""} m-4 border-solid border`}
            onClick={() => props.workbench.setActiveModuleId(props.moduleInstance.getId())}
        >
            {createContent()}
        </div>
    );
};
