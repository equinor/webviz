import type React from "react";

export function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>): (node: T | null) => void {
    return (node) => {
        for (const ref of refs) {
            if (!ref) continue;
            if (typeof ref === "function") ref(node);
            else
                try {
                    (ref as React.MutableRefObject<T | null>).current = node;
                } catch {
                    /* read-only RefObject */
                }
        }
    };
}
