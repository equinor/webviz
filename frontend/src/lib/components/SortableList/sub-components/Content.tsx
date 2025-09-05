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

    const { registerContentContainer, reportContentBoundingRect } = context;

    const setContainer = React.useCallback(
        function setContainer(el: Element | null) {
            const node = (el as HTMLElement | null) ?? null;
            containerRef.current = node;
            registerContentContainer(node);
            if (node) {
                reportContentBoundingRect(node.getBoundingClientRect());
            }
        },
        [reportContentBoundingRect, registerContentContainer],
    );

    const mergedRef = composeRefs<HTMLElement>(setContainer, (onlyChild as any).ref);

    React.useEffect(
        function setupContent() {
            const container = containerRef.current;
            if (!container) return;

            const reportContentRect = () => {
                reportContentBoundingRect(container.getBoundingClientRect());
            };

            const resizeObserver = new ResizeObserver(reportContentRect);
            resizeObserver.observe(container);

            reportContentRect();

            return () => {
                resizeObserver.disconnect();
                registerContentContainer(null);
            };
        },
        [reportContentBoundingRect, registerContentContainer],
    );

    return React.cloneElement(onlyChild, {
        ref: mergedRef,
    });
}
