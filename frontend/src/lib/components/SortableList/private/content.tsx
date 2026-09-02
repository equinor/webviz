import React from "react";

import { isDevMode } from "@lib/utils/devMode";

import { SortableListContext } from "../sortableList";
import { useComposedRefs } from "../utils/useComposedRefs";

export type ContentProps = {
    // The content element that wraps all sortable items. Must be a single React element.
    // If a functional component is used, it must be wrapped in React.forwardRef.
    children: React.ReactElement;
};

export function Content(props: ContentProps): React.ReactElement {
    const { registerContentContainer } = React.useContext(SortableListContext);

    const containerRef = React.useRef<HTMLElement | null>(null);
    const onlyChild = React.Children.only(props.children) as React.ReactElement;

    React.useEffect(function devWarningEffect() {
        if (isDevMode() && containerRef.current == null) {
            console.warn("[SortableList.Content] No DOM node registered. Child likely isn't ref-forwarding.");
        }
    }, []);

    const setContainer = React.useCallback(
        function setContainer(el: Element | null) {
            const node = (el as HTMLElement | null) ?? null;
            if (containerRef.current === node) {
                return;
            }
            containerRef.current = node;
            registerContentContainer(node);
        },
        [registerContentContainer],
    );

    const mergedRef = useComposedRefs<HTMLElement>(setContainer, (onlyChild as any).ref);

    return React.cloneElement(onlyChild, {
        ref: mergedRef,
    });
}
