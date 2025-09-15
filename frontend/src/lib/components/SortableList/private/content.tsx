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

    const { registerContentContainer } = context;

    const setContainer = React.useCallback(
        function setContainer(el: Element | null) {
            const node = (el as HTMLElement | null) ?? null;
            containerRef.current = node;
            registerContentContainer(node);
        },
        [registerContentContainer],
    );

    const mergedRef = composeRefs<HTMLElement>(setContainer, (onlyChild as any).ref);

    return React.cloneElement(onlyChild, {
        ref: mergedRef,
    });
}
