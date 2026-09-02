import React from "react";

import { isDevMode } from "@lib/utils/devMode";

import { SortableListContext } from "../sortableList";
import { useComposedRefs } from "../utils/useComposedRefs";

export type DropZoneProps = {
    children: React.ReactElement;
};

export const NoDropZone = React.forwardRef<HTMLElement, DropZoneProps>(
    function NoDropZone(props, externalRef): React.ReactElement {
        const { registerNoDropZoneElement, unregisterNoDropZoneElement } = React.useContext(SortableListContext);
        const only = React.Children.only(props.children) as React.ReactElement;

        const noDropZoneElementRef = React.useRef<HTMLElement | null>(null);

        const mergedRef = useComposedRefs<HTMLElement>(
            externalRef as React.Ref<HTMLElement>,
            (el) => {
                noDropZoneElementRef.current = el;
            },
            (only as any).ref,
        );

        React.useEffect(function devWarningEffect() {
            if (isDevMode() && noDropZoneElementRef.current == null) {
                console.warn("[SortableList.NoDropZone] No DOM node registered. Child likely isn't ref-forwarding.");
            }
        }, []);

        React.useEffect(
            function registerEffect() {
                if (noDropZoneElementRef.current) {
                    registerNoDropZoneElement(noDropZoneElementRef.current);
                }
                return () => {
                    if (noDropZoneElementRef.current) {
                        unregisterNoDropZoneElement(noDropZoneElementRef.current);
                    }
                };
            },
            [registerNoDropZoneElement, unregisterNoDropZoneElement],
        );

        return (
            <>
                {React.cloneElement(only, {
                    ref: mergedRef,
                    "data-sortable": "noDropZone",
                })}
            </>
        );
    },
);

NoDropZone.displayName = "SortableList.NoDropZone";
