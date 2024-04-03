import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance } from "@framework/ModuleInstance";

export const useImportState = (moduleInstance: ModuleInstance<any, any>): ImportState => {
    const [importState, setImportState] = React.useState<ImportState>(moduleInstance.getImportState());

    React.useEffect(() => {
        const unsubscribeFunc = moduleInstance.subscribeToImportStateChange(() => {
            setImportState(moduleInstance.getImportState());
        });
        return unsubscribeFunc;
    }, [moduleInstance]);

    return importState;
};
