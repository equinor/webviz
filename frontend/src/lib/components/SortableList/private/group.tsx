import React from "react";

import { createPortal } from "@lib/utils/createPortal";

import { composeRefs } from "../utils/composeRefs";

import { useMakeDragGhostElement } from "./useMakeDragGhostElement";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type GroupProps = {
    id: string;
    children: React.ReactElement;
};

export const Group = React.forwardRef<HTMLElement, GroupProps>(function Group(props, externalRef) {
    const onlyChild = React.Children.only(props.children) as React.ReactElement;

    const localRef = React.useRef<HTMLElement | null>(null);
    const mergedRef = composeRefs<HTMLElement>(
        externalRef as React.Ref<HTMLElement>,
        (el) => {
            localRef.current = el;
        },
        (onlyChild as any).ref,
    );

    const dragGhostElement = useMakeDragGhostElement(props.id, onlyChild, localRef);

    return (
        <>
            {React.cloneElement(onlyChild, {
                ref: mergedRef,
                "data-sortable": "group",
                "data-item-id": props.id,
            })}
            {createPortal(dragGhostElement)}
        </>
    );
});
