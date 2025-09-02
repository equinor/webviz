import React from "react";

import { composeRefs } from "../utils/composeRefs";

export type ScrollContainerProps = {
    children: React.ReactNode;
};

export function ScrollContainer(props: ScrollContainerProps): React.ReactNode {
    const onlyChild = React.Children.only(props.children) as React.ReactElement;
    const localRef = React.useRef<HTMLElement | null>(null);

    const setRef = React.useCallback((el: Element | null) => {
        localRef.current = el as HTMLElement | null;
    }, []);

    const mergedRef = composeRefs<HTMLElement>(setRef, (onlyChild as any).ref);

    return React.cloneElement(onlyChild, {
        ref: mergedRef,
        "data-sl-scroll-container": "",
    });
}
