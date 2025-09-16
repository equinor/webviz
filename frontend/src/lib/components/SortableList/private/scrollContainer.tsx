import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SortableListContext } from "../sortableList";
import { useComposedRefs } from "../utils/useComposeRefs";
import { isDevMode } from "@lib/utils/devMode";

export type ScrollContainerProps = {
    children: React.ReactElement;
};

export const ScrollContainer = React.forwardRef<HTMLElement, ScrollContainerProps>(
    function ScrollContainer(props, forwardedRef): React.ReactElement {
        const onlyChild = React.Children.only(props.children) as React.ReactElement;
        const lastNodeRef = React.useRef<HTMLElement | null>(null);
        const { registerScrollContainerElement } = React.useContext(SortableListContext);

        const setScroller = React.useCallback(
            function setScroller(el: Element | null) {
                const node = (el as HTMLElement | null) ?? null;
                if (lastNodeRef.current === node) {
                    return;
                }
                lastNodeRef.current = node;
                registerScrollContainerElement(node);
            },
            [registerScrollContainerElement],
        );

        React.useEffect(function warnIfNoRefAttached() {
            if (isDevMode() && lastNodeRef.current == null) {
                console.warn(
                    "[SortableList.ScrollContainer] Child did not attach a ref. Use a host element or wrap the child with React.forwardRef.",
                );
            }
        }, []);

        const mergedRef = useComposedRefs<HTMLElement>(forwardedRef, setScroller, (onlyChild as any).ref);

        return React.cloneElement(onlyChild, {
            ref: mergedRef,
            "data-sl-scroll-container": "",
            className: resolveClassNames(onlyChild.props.className, "relative"),
        });
    },
);

ScrollContainer.displayName = "SortableList.ScrollContainer";
