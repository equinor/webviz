import { CloudOff, HistoryToggleOff, Science } from "@mui/icons-material";

import { ModuleDevState } from "@framework/Module";

export const ICON_SIZE_PX = 16;

export function DevStateIcon(props: { devState: ModuleDevState }): React.ReactNode {
    if (props.devState === ModuleDevState.DEPRECATED) {
        return (
            <HistoryToggleOff
                className="text-danger-subtle"
                titleAccess="Deprecated"
                style={{ fontSize: ICON_SIZE_PX }}
            />
        );
    }

    if (props.devState === ModuleDevState.DEV) {
        return (
            <Science className="text-warning-subtle" titleAccess="Experimental" style={{ fontSize: ICON_SIZE_PX }} />
        );
    }

    return null;
}

export function PersistenceIcon(props: { isSerializable: boolean }): React.ReactNode {
    if (!props.isSerializable) {
        return (
            <CloudOff
                className="text-neutral-subtle"
                titleAccess="Module settings won't be saved"
                style={{ fontSize: ICON_SIZE_PX }}
            />
        );
    }
    return null;
}
