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
    onScroll?: (newStartIndex: number, newEndIndex: number) => void;
};

const defaultProps = {
    placeholderComponent: "div",
    startIndex: 0,
};

export const Virtualization = withDefaults<VirtualizationProps>()(defaultProps, (props) => {
    const { onScroll, onLoadedRangeChange } = props;

    const containerSize = useElementSize(props.containerRef);

    // Ref to avoid unnecessary callbacks
    const lastScrolledRange = React.useRef({ start: -1, end: -1 });
    const [range, setRange] = React.useState<{ start: number; end: number }>({ start: props.startIndex, end: 0 });

    const placeholderSizes = React.useMemo(() => {
        return {
            start: range.start * props.itemSize,
            end: (props.items.length - range.end - 1) * props.itemSize,
        };
    }, [props.itemSize, props.items.length, range.end, range.start]);

    React.useEffect(
        // As the top index changes, scroll the index into view
        function scrollToStartIndexEffect() {
            if (!props.containerRef.current || props.startIndex === undefined) return;

            const scrollSide = props.direction === "horizontal" ? "scrollLeft" : "scrollTop";

            // ! This will trigger the onScroll event handler
            props.containerRef.current[scrollSide] = Math.max(0, props.startIndex * props.itemSize);
        },
        [props.containerRef, props.direction, props.itemSize, props.startIndex],
    );

    React.useEffect(
        function mountScrollEffect() {
            function handleScroll() {
                if (props.containerRef.current) {
                    const scrollPosition =
                        props.direction === "vertical"
                            ? props.containerRef.current.scrollTop
                            : props.containerRef.current.scrollLeft;

                    const size = props.direction === "vertical" ? containerSize.height : containerSize.width;

                    const newRange = {
                        start: Math.max(0, Math.floor(scrollPosition / props.itemSize) - 1),
                        end: Math.min(props.items.length - 1, Math.ceil((scrollPosition + size) / props.itemSize)),
                    };

                    if (!isEqual(newRange, lastScrolledRange.current)) {
                        lastScrolledRange.current = newRange;
                        setRange(newRange);
                        onScroll?.(newRange.start, newRange.end);
                    }
                }
            }

            if (props.containerRef.current) {
                props.containerRef.current.addEventListener("scroll", handleScroll);
            }

            // Run once to give initial scroll values
            handleScroll();

            return function unmountScrollEffect() {
                if (props.containerRef.current) {
                    props.containerRef.current.removeEventListener("scroll", handleScroll);
                }
            };
        },
        [
            props.containerRef,
            props.direction,
            props.items,
            props.itemSize,
            containerSize.height,
            containerSize.width,
            onScroll,
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
