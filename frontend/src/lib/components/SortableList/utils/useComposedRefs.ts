import React from "react";

export function useComposedRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
    const refsRef = React.useRef(refs);
    refsRef.current = refs;

    return React.useCallback(function composeRefs(node: T | null) {
        for (const ref of refsRef.current) {
            if (!ref) {
                continue;
            }
            if (typeof ref === "function") {
                ref(node);
            } else {
                (ref as React.MutableRefObject<T | null>).current = node;
            }
        }
    }, []);
}
