import React from "react";

import { isEqual } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";

import { withDefaults } from "../_component-utils/components";

export type VirtualizationProps<T = any> = {
    placeholderComponent?: string;
    containerRef: React.RefObject<HTMLElement>;
    items: Array<T>;
    renderItem: (item: T, index: number) => React.ReactNode;
    itemSize: number;
    direction: "vertical" | "horizontal";
    startIndex?: number;
    overscan?: number | { head: number; tail: number };
    onStartIndexChange?: (newStartIndex: number) => void;
    onRangeComputed?: (startIndex: number, endIndex: number) => void;
};

const defaultProps = {
    placeholderComponent: "div",
    startIndex: 0,
    overscan: 1,
};

type VirtualizationRange = { start: number; end: number };

export const Virtualization = withDefaults<VirtualizationProps>()(defaultProps, (props) => {
    const { onStartIndexChange, onRangeComputed } = props;

    const containerSize = useElementSize(props.containerRef);

    // Ref to avoid unnecessary callbacks
    const lastScrolledRange = React.useRef<VirtualizationRange>({ start: -1, end: -1 });
    const isProgrammaticScroll = React.useRef(false);

    const [range, setRange] = React.useState<VirtualizationRange>({ start: props.startIndex, end: 0 });

    const placeholderSizes = React.useMemo(() => {
        return {
            start: range.start * props.itemSize,
            end: (props.items.length - range.end - 1) * props.itemSize,
        };
    }, [props.itemSize, props.items.length, range.end, range.start]);

    const overscanAmt = React.useMemo(() => {
        if (typeof props.overscan === "object") return props.overscan;

        return { head: props.overscan, tail: props.overscan };
    }, [props.overscan]);

    const updateVirtualizationRange = React.useCallback(
        function updateVirtualizationRange(newRange: VirtualizationRange) {
            setRange(newRange);
            onRangeComputed?.(newRange.start, newRange.end);

            // Avoid retriggering programmatic index changes
            if (!isProgrammaticScroll.current) onStartIndexChange?.(newRange.start);

            lastScrolledRange.current = newRange;
            isProgrammaticScroll.current = false;
        },
        [onRangeComputed, onStartIndexChange],
    );

    React.useEffect(
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

                const startIndex = Math.floor(scrollPosition / props.itemSize) - overscanAmt.head;
                const endIndex = Math.floor((scrollPosition + size) / props.itemSize) + overscanAmt.tail;

                const newRange = {
                    start: Math.max(0, startIndex),
                    end: Math.min(props.items.length - 1, endIndex),
                };

                if (!isEqual(newRange, lastScrolledRange.current)) {
                    updateVirtualizationRange(newRange);
                }
            }

            if (currentContainer) {
                currentContainer?.addEventListener("scroll", handleScroll);
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
            overscanAmt.head,
            overscanAmt.tail,
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
                .slice(range.start, range.end + 1)
                .map((item, index) => props.renderItem(item, range.start + index))}
            {placeholderSizes.end > 0 &&
                React.createElement(props.placeholderComponent, { style: makeStyle(placeholderSizes.end) })}
        </>
    );
});

Virtualization.displayName = "Virtualization";
