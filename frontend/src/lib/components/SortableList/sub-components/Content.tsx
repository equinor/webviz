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

    const { registerContentContainer, registerScrollContainerElement, reportContentBoundingRect } = context;

    const setContainer = React.useCallback(
        function setContainer(el: Element | null) {
            const node = (el as HTMLElement | null) ?? null;
            containerRef.current = node;
            registerContentContainer(node);
            if (node) {
                reportContentBoundingRect(node.getBoundingClientRect());
            }
        },
        [reportContentBoundingRect],
    );

    const mergedRef = composeRefs<HTMLElement>(setContainer, (onlyChild as any).ref);

    React.useEffect(
        function setupContent() {
            const container = containerRef.current;
            if (!container) return;

            let scrollEl: HTMLElement | null = null;
            if (container.hasAttribute("data-sl-scroll-container")) {
                scrollEl = container;
            } else {
                scrollEl = container.querySelector<HTMLElement>("[data-sl-scroll-container]");
            }

            registerScrollContainerElement(scrollEl ?? null);

            const reportContentRect = () => {
                reportContentBoundingRect(container.getBoundingClientRect());
            };

            const resizeObserver = new ResizeObserver(reportContentRect);
            resizeObserver.observe(container);

            if (scrollEl) {
                scrollEl.addEventListener("scroll", reportContentRect, { passive: true });
            }

            reportContentRect();

            return () => {
                resizeObserver.disconnect();
                if (scrollEl) {
                    scrollEl.removeEventListener("scroll", reportContentRect);
                }
                registerScrollContainerElement(null);
                registerContentContainer(null);
            };
        },
        [reportContentBoundingRect, registerScrollContainerElement, registerContentContainer],
    );

    return React.cloneElement(onlyChild, {
        ref: mergedRef,
    });
}
