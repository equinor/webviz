import React from "react";

import { SortableListContext } from "../sortableList";
import { composeRefs } from "../utils/composeRefs";

export type ScrollContainerProps = {
    children: React.ReactNode;
};

export const ScrollContainer = React.forwardRef<HTMLElement, ScrollContainerProps>(
    function ScrollContainer(props, forwardedRef) {
        const onlyChild = React.Children.only(props.children) as React.ReactElement;
        const localRef = React.useRef<HTMLElement | null>(null);
        const { getContentContainer, registerScrollContainerElement, reportContentBoundingRect } =
            React.useContext(SortableListContext);

        const setScroller = React.useCallback(
            (el: Element | null) => {
                const node = (el as HTMLElement | null) ?? null;
                localRef.current = node;
                registerScrollContainerElement(node);
            },
            [registerScrollContainerElement],
        );

        const mergedRef = composeRefs<HTMLElement>(forwardedRef, setScroller, (onlyChild as any).ref);

        React.useEffect(() => {
            const scroller = localRef.current;
            const container = getContentContainer?.() ?? null;
            if (!scroller || !container) return;
            const report = () => reportContentBoundingRect(container.getBoundingClientRect());
            scroller.addEventListener("scroll", report as any, { passive: true });
            report();
            return () => scroller.removeEventListener("scroll", report as any);
        }, [getContentContainer, reportContentBoundingRect]);

        return React.cloneElement(onlyChild, {
            ref: mergedRef,
            "data-sl-scroll-container": "",
        });
    },
);
