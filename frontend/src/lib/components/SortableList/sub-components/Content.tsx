import React from "react";

import { SortableListContext } from "../sortableList";
import { composeRefs } from "../utils/composeRefs";

export type ContentProps = {
    children: React.ReactNode;
};

export function Content(props: ContentProps): React.ReactNode {
    const context = React.useContext(SortableListContext);
    const containerRef = React.useRef<HTMLElement | null>(null);
    const onlyChild = React.Children.only(props.children) as React.ReactElement;

    const setContainer = React.useCallback(
        function setContainer(el: Element | null) {
            const node = (el as HTMLElement | null) ?? null;
            containerRef.current = node;
            context.registerContentContainer(node);
            if (node) {
                context.reportContentBoundingRect(node.getBoundingClientRect());
            }
        },
        [context],
    );

    const mergedRef = composeRefs<HTMLElement>(setContainer, (onlyChild as any).ref);

    React.useEffect(
        function setupContent() {
            const container = containerRef.current;
            if (!container) return;

            const marker = container.querySelector("[data-sl-scroll-container]") as HTMLElement | null;
            context.registerScrollContainerElement(marker);

            const reportContentRect = () => {
                context.reportContentBoundingRect(container.getBoundingClientRect());
            };

            const resizeObserver = new ResizeObserver(reportContentRect);
            resizeObserver.observe(container);

            if (marker) {
                marker.addEventListener("scroll", reportContentRect, { passive: true });
            }

            reportContentRect();

            return () => {
                resizeObserver.disconnect();
                if (marker) {
                    marker.removeEventListener("scroll", reportContentRect);
                }
                context.registerScrollContainerElement(null);
                context.registerContentContainer(null);
            };
        },
        [context],
    );

    return React.cloneElement(onlyChild, {
        ref: mergedRef,
    });
}
