import { CloudOff, HistoryToggleOff, Science } from "@mui/icons-material";

import { ModuleDevState } from "@framework/Module";

export const ICON_SIZE_PX = 16;

export function DevStateIcon(props: { devState: ModuleDevState }): React.ReactNode {
    if (props.devState === ModuleDevState.DEPRECATED) {
        return (
            <span title="Deprecated" className="inline-block align-middle">
                <HistoryToggleOff style={{ fontSize: ICON_SIZE_PX }} />
            </span>
        );
    }
    if (props.devState === ModuleDevState.DEV) {
        return (
            <span title="Experimental" className="inline-block align-middle">
                <Science style={{ fontSize: ICON_SIZE_PX }} />
            </span>
        );
    }

    return null;
}

export function PersistenceIcon(props: { isSerializable: boolean }): React.ReactNode {
    if (!props.isSerializable) {
        return (
            <span title="Module settings won't be saved" className="inline-block align-middle">
                <CloudOff style={{ fontSize: ICON_SIZE_PX }} />
            </span>
        );
    }
    return null;
}
