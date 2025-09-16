import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SortableListContext } from "../sortableList";
import { composeRefs } from "../utils/composeRefs";

export type ScrollContainerProps = {
    children: React.ReactNode;
};

export const ScrollContainer = React.forwardRef<HTMLElement, ScrollContainerProps>(
    function ScrollContainer(props, forwardedRef) {
        const onlyChild = React.Children.only(props.children) as React.ReactElement;
        const localRef = React.useRef<HTMLElement | null>(null);
        const { registerScrollContainerElement } = React.useContext(SortableListContext);

        const setScroller = React.useCallback(
            (el: Element | null) => {
                const node = (el as HTMLElement | null) ?? null;
                localRef.current = node;
                registerScrollContainerElement(node);
            },
            [registerScrollContainerElement],
        );

        const mergedRef = composeRefs<HTMLElement>(forwardedRef, setScroller, (onlyChild as any).ref);

        return React.cloneElement(onlyChild, {
            ref: mergedRef,
            "data-sl-scroll-container": "",
            className: resolveClassNames(onlyChild.props.className, "relative"),
        });
    },
);
