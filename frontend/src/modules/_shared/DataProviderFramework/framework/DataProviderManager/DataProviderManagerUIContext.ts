import React from "react";

export type DataProviderManagerUI = {
    pendingOpenMenuItemId: string | null;
    clearPendingOpenMenuItemId: () => void;
};

export const DataProviderManagerUIContext = React.createContext<DataProviderManagerUI>({
    pendingOpenMenuItemId: null,
    clearPendingOpenMenuItemId: () => {},
});
