import React from "react";

import { isEqual } from "lodash";

export function useTrackedGlobalValue<T>(globalValue: T, onGlobalChange: () => void) {
    const prevGlobal = React.useRef<T | null>(null);

    if (!isEqual(prevGlobal.current, globalValue)) {
        prevGlobal.current = globalValue;
        onGlobalChange();
    }
}
