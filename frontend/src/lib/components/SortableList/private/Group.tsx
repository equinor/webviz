import React from "react";

import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { composeRefs } from "../utils/composeRefs";

import { useMakeDragGhostElement } from "./useMakeDragGhostElement";
import { useMakeElementClassName } from "./useMakeElementClassNames";

export type GroupProps = {
    id: string;
    children: React.ReactElement; // ✅ exactly one element
};

export const Group = React.forwardRef<HTMLElement, GroupProps>(function Group({ id, children }, externalRef) {
    const only = React.Children.only(children) as React.ReactElement;

    const localRef = React.useRef<HTMLElement | null>(null);
    const mergedRef = composeRefs<HTMLElement>(
        externalRef as React.Ref<HTMLElement>,
        (el) => {
            localRef.current = el;
        },
        (only as any).ref,
    );

    let className = useMakeElementClassName(id);
    className = resolveClassNames(only.props.className, className);

    const dragGhostElement = useMakeDragGhostElement(id, only, localRef);

    return (
        <>
            {React.cloneElement(only, {
                ref: mergedRef,
                "data-sortable": "group",
                "data-item-id": id,
                className,
            })}
            {createPortal(dragGhostElement)}
        </>
    );
});
