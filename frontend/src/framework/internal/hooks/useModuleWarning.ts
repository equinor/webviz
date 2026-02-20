import React from "react";

import { ModuleDevState } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";

/**
 * Local hook to get warning text for a module instance.
 */
function useModuleWarningText(moduleInstance: ModuleInstance<any, any> | undefined): string | null {
    return React.useMemo(() => {
        if (!moduleInstance) return null;

        const isSerializable = moduleInstance.getModule().canBeSerialized();
        const isDevModule = moduleInstance.getModule().getDevState() === ModuleDevState.DEV;

        if (!isSerializable && isDevModule) {
            return "This module is under development and without persistence. Major changes can occur without warning, and state changes will not be saved.";
        } else if (isDevModule) {
            return "This module is under development. Major changes can occur without warning.";
        } else if (!isSerializable) {
            return "This module cannot be persisted yet. State changes will not be saved.";
        }
        return null;
    }, [moduleInstance]);
}

/**
 * Hook to manage module warning visibility and dismissal.
 */
export function useModuleWarning(moduleInstance: ModuleInstance<any, any> | undefined) {
    const storageKey = moduleInstance ? `module-warning-dismissed-${moduleInstance.getId()}` : null;
    const warningText = useModuleWarningText(moduleInstance);

    const [isDismissed, setIsDismissed] = React.useState(
        () => !!storageKey && localStorage.getItem(storageKey) === "true",
    );

    React.useEffect(() => {
        setIsDismissed(!!storageKey && localStorage.getItem(storageKey) === "true");
    }, [storageKey]);

    const dismissWarning = React.useCallback(() => {
        if (storageKey) localStorage.setItem(storageKey, "true");
        setIsDismissed(true);
    }, [storageKey]);

    const showWarning = React.useCallback(() => {
        if (storageKey) localStorage.removeItem(storageKey);
        setIsDismissed(false);
    }, [storageKey]);

    return {
        warningText,
        isWarningVisible: !!warningText && !isDismissed,
        dismissWarning,
        showWarning,
    };
}
