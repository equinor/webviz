import React from "react";

import { createPortal } from "@lib/utils/createPortal";
import { isDevMode } from "@lib/utils/devMode";

import { useComposedRefs } from "../utils/useComposedRefs";
import { assertSafeId } from "../utils/validateId";

import { useMakeDragGhostElement } from "./useMakeDragGhostElement";

export type GroupProps = {
    id: string;
    children: React.ReactElement;
};

export const Group = React.forwardRef<HTMLElement, GroupProps>(function Group(props, externalRef): React.ReactElement {
    assertSafeId(props.id);

    const onlyChild = React.Children.only(props.children) as React.ReactElement;

    const groupElementRef = React.useRef<HTMLElement | null>(null);

    React.useEffect(function devWarningEffect() {
        if (isDevMode() && groupElementRef.current == null) {
            console.warn("[SortableList.Group] No DOM node registered. Child likely isn't ref-forwarding.");
        }
    }, []);

    const mergedRef = useComposedRefs<HTMLElement>(
        externalRef as React.Ref<HTMLElement>,
        (el) => {
            groupElementRef.current = el;
        },
        (onlyChild as any).ref,
    );

    const dragGhostElement = useMakeDragGhostElement(props.id, onlyChild, groupElementRef);

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

Group.displayName = "SortableList.Group";
