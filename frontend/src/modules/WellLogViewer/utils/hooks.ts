import { useRef } from "react";

import { isEqual } from "lodash";

export function useTrackedGlobalValue<T>(globalValue: T, onGlobalChange: () => void) {
    const prevGlobal = useRef<T | null>(null);

    if (!isEqual(prevGlobal.current, globalValue)) {
        prevGlobal.current = globalValue;
        onGlobalChange();
    }
}
