import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { Virtualization } from "../../Virtualization";

const DEFAULT_RECT_MIN_WIDTH = 120;

export type DropdownItemListProps<T> = {
    anchorElRef: React.RefObject<HTMLElement>;
    items: T[];
    emptyListText: string;
    optionHeight: number;
    dropdownMaxHeight: number;
    itemFocusIndex?: number;
    minWidth?: number;
    renderItem?: (item: T, index: number) => React.ReactNode;
};

type DropdownRect = {
    left?: number;
    top?: number;
    right?: number;
    width: number;
    height: number;
    minWidth: number;
};

export function DropdownItemListComponent<T>(
    props: DropdownItemListProps<T>,
    ref: React.Ref<HTMLUListElement>,
): React.ReactNode {
    const bodyRef = React.useRef(document.body);
    const innerDropdownRef = React.useRef<HTMLUListElement>(null);
    // Allow both internal and external use of the dropdown ref
    React.useImperativeHandle(ref, () => innerDropdownRef.current!, []);

    const bodyRect = useElementBoundingRect(bodyRef);
    const anchorRect = useElementBoundingRect(props.anchorElRef);

    const [dropdownFlipped, setDropdownFlipped] = React.useState(false);
    const [dropdownRect, setDropdownRect] = React.useState<DropdownRect>({
        width: 0,
        minWidth: 0,
        height: 0,
        // Start off-screen to avoid flickering
        left: -9999,
        top: -9999,
    });

    const virtualizerStartIndex = React.useMemo(() => {
        if (props.itemFocusIndex === undefined) return;
        if (!innerDropdownRef.current) return;

        const virtualizationTopIndex = Math.round(innerDropdownRef.current.scrollTop / props.optionHeight);
        const virtualizationBottomIndex = virtualizationTopIndex + props.dropdownMaxHeight / props.optionHeight - 1;

        if (props.itemFocusIndex < virtualizationTopIndex) {
            return props.itemFocusIndex;
        } else if (props.itemFocusIndex >= virtualizationBottomIndex) {
            return Math.max(0, props.itemFocusIndex - props.dropdownMaxHeight / props.optionHeight + 1);
        }
    }, [props.dropdownMaxHeight, props.itemFocusIndex, props.optionHeight]);

    React.useLayoutEffect(
        function computeDropdownRectEffect() {
            if (!anchorRect || !bodyRect) return;
            if (anchorRect.width === 0 && anchorRect.height === 0) return;

            const listLength = Math.max(props.items.length * props.optionHeight, props.optionHeight);
            let isFlipped = false;

            // 9 added to accommodate for border + padding in the list container
            const dropdownHeight = Math.min(listLength + 1, props.dropdownMaxHeight);

            const newDropdownRect: DropdownRect = {
                minWidth: props.minWidth ?? DEFAULT_RECT_MIN_WIDTH,
                width: anchorRect.width,
                height: dropdownHeight,
            };

            const anchorTop = anchorRect.y;
            const anchorBottom = anchorRect.y + anchorRect.height;
            const hasSpaceAbove = anchorTop > dropdownHeight;
            const hasSpaceBelow = window.innerHeight - anchorBottom >= dropdownHeight;

            if (hasSpaceBelow) {
                newDropdownRect.top = anchorRect.y + anchorRect.height;
            } else if (hasSpaceAbove) {
                isFlipped = true;
                newDropdownRect.top = anchorRect.y - dropdownHeight;
            } else {
                // If neither has space, put it below, but squish the height to fit
                newDropdownRect.top = anchorRect.y + anchorRect.height;
                newDropdownRect.height = Math.min(
                    dropdownHeight,
                    window.innerHeight - anchorRect.y - anchorRect.height,
                );
            }

            if (anchorRect.x + anchorRect.width > window.innerWidth / 2) {
                newDropdownRect.right = window.innerWidth - (anchorRect.x + anchorRect.width);
            } else {
                newDropdownRect.left = anchorRect.x;
            }

            setDropdownFlipped(isFlipped);
            setDropdownRect(newDropdownRect);
        },
        [anchorRect, bodyRect, props.dropdownMaxHeight, props.items.length, props.minWidth, props.optionHeight],
    );

    return createPortal(
        <ul
            className={resolveClassNames(
                "absolute bg-white border border-gray-300 rounded-md shadow-md overflow-y-auto z-50 box-border gap-1 px-2",
                {
                    "border-t-0 rounded-t-none": !dropdownFlipped,
                    "border-b-0 rounded-b-none": dropdownFlipped,
                },
            )}
            style={{ ...dropdownRect }}
            ref={innerDropdownRef}
        >
            {props.items.length === 0 && (
                <li
                    className="flex items-center text-gray-400 select-none"
                    style={{
                        height: props.optionHeight,
                    }}
                >
                    {props.emptyListText}
                </li>
            )}
            <Virtualization
                direction="vertical"
                items={props.items}
                itemSize={props.optionHeight}
                containerRef={innerDropdownRef}
                startIndex={virtualizerStartIndex}
                renderItem={(item, idx) => {
                    if (props.renderItem) return props.renderItem(item, idx);

                    return (
                        <li key={String(item) + idx} style={{ height: props.optionHeight }}>
                            {String(item)}
                        </li>
                    );
                }}
            />
        </ul>,
    );
}

export const DropdownItemList = React.forwardRef(DropdownItemListComponent) as <T>(
    props: DropdownItemListProps<T> & { ref?: React.Ref<HTMLUListElement> },
) => React.ReactElement;
