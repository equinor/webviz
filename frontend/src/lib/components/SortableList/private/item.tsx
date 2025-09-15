import React from "react";

import { createPortal } from "@lib/utils/createPortal";

import { composeRefs } from "../utils/composeRefs";

import { useMakeDragGhostElement } from "./useMakeDragGhostElement";

export type ItemProps = {
    id: string;
    children: React.ReactElement;
};

export const Item = React.forwardRef<HTMLElement, ItemProps>(function Item(props, externalRef) {
    const only = React.Children.only(props.children) as React.ReactElement;

    const localRef = React.useRef<HTMLElement | null>(null);
    const mergedRef = composeRefs<HTMLElement>(
        externalRef as React.Ref<HTMLElement>,
        (el) => {
            localRef.current = el;
        },
        (only as any).ref,
    );

    const dragGhostElement = useMakeDragGhostElement(props.id, only, localRef);

    return (
        <>
            {React.cloneElement(only, {
                ref: mergedRef,
                "data-sortable": "item",
                "data-item-id": props.id,
            })}
            {createPortal(dragGhostElement)}
        </>
    );
});
