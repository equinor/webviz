import React from "react";

import { createPortal } from "@lib/utils/createPortal";
import { isDevMode } from "@lib/utils/devMode";

import { useComposedRefs } from "../utils/useComposedRefs";
import { assertSafeId } from "../utils/validateId";

import { useMakeDragGhostElement } from "./useMakeDragGhostElement";

export type ItemProps = {
    id: string;
    children: React.ReactElement;
};

export const Item = React.forwardRef<HTMLElement, ItemProps>(function Item(props, externalRef): React.ReactElement {
    assertSafeId(props.id);

    const only = React.Children.only(props.children) as React.ReactElement;

    const itemElementRef = React.useRef<HTMLElement | null>(null);

    const mergedRef = useComposedRefs<HTMLElement>(
        externalRef as React.Ref<HTMLElement>,
        (el) => {
            itemElementRef.current = el;
        },
        (only as any).ref,
    );

    React.useEffect(function devWarningEffect() {
        if (isDevMode() && itemElementRef.current == null) {
            console.warn("[SortableList.Item] No DOM node registered. Child likely isn't ref-forwarding.");
        }
    }, []);

    const dragGhostElement = useMakeDragGhostElement(props.id, only, itemElementRef);

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

Item.displayName = "SortableList.Item";
