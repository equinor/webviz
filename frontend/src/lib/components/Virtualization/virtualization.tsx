import React from "react";

import { isEqual } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";

import { withDefaults } from "../_component-utils/components";

export type VirtualizationProps<T = any> = {
    /** The HTML tag to use for the generated spacer elements */
    placeholderComponent?: React.ElementType;
    /** The scrollable parent to virtualize items inside of */
    containerRef: React.RefObject<HTMLElement>;
    /** The list of items to virtualize */
    items: Array<T>;

    /** Callback for rendering items in the list. The rendered item's size should match `props.itemSize` */
    renderItem: (item: T, index: number) => React.ReactNode;
    /** The pixel size of each rendered item */
    itemSize: number;
    /** Scrolling direction */
    direction: "vertical" | "horizontal";
    /** The list's scroll position, by item index */
    startIndex?: number;
    /** The amount of items rendered outside the visible scroll area. A higher number means less flickering as you scroll */
    overscan?: number | { head: number; tail: number };
    /** Callback for internal start-index. Not called with `props.startIndex` changes */
    onStartIndexChange?: (newStartIndex: number) => void;
    /** Callback for when the rendered item range changes. *Will* retrigger if `props.startIndex` is changed */
    onRangeComputed?: (startIndex: number, endIndex: number) => void;
};

const defaultProps = {
    placeholderComponent: "div" as React.ElementType,
    startIndex: 0,
    overscan: 1,
};

type VisibleItemsRange = { start: number; end: number };

export const Virtualization = withDefaults<VirtualizationProps>()(defaultProps, (props) => {
    const { onStartIndexChange, onRangeComputed } = props;

    const containerSize = useElementSize(props.containerRef);

    // Refs to avoid unnecessary callbacks
    const lastScrolledRange = React.useRef<VisibleItemsRange>({ start: -1, end: -1 });
    const isProgrammaticScroll = React.useRef(false);

    const overscanAmount = React.useMemo(() => {
        if (typeof props.overscan === "object") return props.overscan;
        return { head: props.overscan, tail: props.overscan };
    }, [props.overscan]);

    // Items visible within the scroll container
    const [visibleItemsRange, setVisibleItemsRange] = React.useState<VisibleItemsRange>({
        start: props.startIndex,
        end: 0,
    });

    const placeholderSizes = React.useMemo(() => {
        const hiddenItemsStart = visibleItemsRange.start - overscanAmount.head;
        const hiddenItemsEnd = props.items.length - visibleItemsRange.end - overscanAmount.tail - 1;

        return {
            start: Math.max(0, hiddenItemsStart) * props.itemSize,
            end: Math.max(0, hiddenItemsEnd) * props.itemSize,
        };
    }, [
        props.itemSize,
        props.items.length,
        overscanAmount.head,
        overscanAmount.tail,
        visibleItemsRange.end,
        visibleItemsRange.start,
    ]);

    const itemRenderRange = React.useMemo(() => {
        return {
            start: Math.max(0, visibleItemsRange.start - overscanAmount.head),
            end: Math.min(props.items.length, visibleItemsRange.end + overscanAmount.tail),
        };
    }, [overscanAmount.head, overscanAmount.tail, props.items.length, visibleItemsRange.end, visibleItemsRange.start]);

    const updateVirtualizationRange = React.useCallback(
        function updateVirtualizationRange(newRange: VisibleItemsRange) {
            setVisibleItemsRange(newRange);
            onRangeComputed?.(newRange.start, newRange.end);

            // Avoid retriggering programmatic index changes
            if (!isProgrammaticScroll.current) onStartIndexChange?.(newRange.start);

            lastScrolledRange.current = newRange;
            isProgrammaticScroll.current = false;
        },
        [onRangeComputed, onStartIndexChange],
    );

    React.useLayoutEffect(
        // As the top index changes, scroll the index into view
        function scrollToStartIndexEffect() {
            if (!props.containerRef.current || props.startIndex === undefined) return;

            const scrollSide = props.direction === "horizontal" ? "scrollLeft" : "scrollTop";

            // ! This will trigger the onScroll event handler
            // Flag this as a programmatic scroll to avoid callback re-triggering
            isProgrammaticScroll.current = true;
            props.containerRef.current[scrollSide] = Math.max(0, props.startIndex * props.itemSize);
        },
        [props.containerRef, props.direction, props.itemSize, props.startIndex],
    );

    React.useEffect(
        function mountScrollEffect() {
            const currentContainer = props.containerRef.current;
            const isVertical = props.direction === "vertical";

            function handleScroll() {
                if (!currentContainer) return;
                if (props.itemSize === 0) return;

                const scrollPosition = isVertical ? currentContainer.scrollTop : currentContainer.scrollLeft;
                const size = isVertical ? containerSize.height : containerSize.width;

                const startIndex = Math.floor(scrollPosition / props.itemSize);
                const endIndex = Math.ceil((scrollPosition + size) / props.itemSize) - 1;

                const newRange = {
                    start: startIndex,
                    end: endIndex,
                };

                if (!isEqual(newRange, lastScrolledRange.current)) {
                    updateVirtualizationRange(newRange);
                }
            }

            if (currentContainer) {
                currentContainer.addEventListener("scroll", handleScroll);
            }

            // Run once to give initial scroll values
            handleScroll();

            return function unmountScrollEffect() {
                if (currentContainer) {
                    currentContainer.removeEventListener("scroll", handleScroll);
                }
            };
        },
        [
            props.containerRef,
            props.direction,
            props.items.length,
            props.itemSize,
            containerSize.height,
            containerSize.width,
            overscanAmount.head,
            overscanAmount.tail,
            updateVirtualizationRange,
        ],
    );

    function makeStyle(size: number) {
        if (props.direction === "vertical") {
            return { height: size };
        } else {
            return { width: size };
        }
    }

    return (
        <>
            {placeholderSizes.start > 0 &&
                React.createElement(props.placeholderComponent, { style: makeStyle(placeholderSizes.start) })}
            {props.items
                .slice(itemRenderRange.start, itemRenderRange.end + 1)
                .map((item, index) => props.renderItem(item, index + itemRenderRange.start))}
            {placeholderSizes.end > 0 &&
                React.createElement(props.placeholderComponent, { style: makeStyle(placeholderSizes.end) })}
        </>
    );
});

Virtualization.displayName = "Virtualization";
