import React from "react";

import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { composeRefs } from "../utils/composeRefs";

import { useMakeDragGhostElement } from "./useMakeDragGhostElement";
import { useMakeElementClassName } from "./useMakeElementClassNames";


export type GroupProps = {
    id: string;
    children: React.ReactElement;
};

export const Group = React.forwardRef<HTMLElement, GroupProps>(function Group(props, externalRef) {
    const only = React.Children.only(props.children) as React.ReactElement;

    const localRef = React.useRef<HTMLElement | null>(null);
    const mergedRef = composeRefs<HTMLElement>(
        externalRef as React.Ref<HTMLElement>,
        (el) => {
            localRef.current = el;
        },
        (only as any).ref
    );

    let className = useMakeElementClassName(props.id);
    className = resolveClassNames(only.props.className, className);

    const dragGhostElement = useMakeDragGhostElement(props.id, only, localRef);

    return (
        <>
            {React.cloneElement(only, {
                ref: mergedRef,
                "data-sortable": "group",
                "data-item-id": props.id,
                className,
            })}
            {createPortal(dragGhostElement)}
        </>
    );
});
