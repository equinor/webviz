import React from "react";

import { isEqual } from "lodash-es";

import { useElementSize } from "@lib/hooks/useElementSize";
import { elementIsVisible } from "@lib/utils/htmlElementUtils";

import { withDefaults } from "../_shared/utils/defaultProps";

export type VirtualizationProps<T = any> = {
    /** HTML tag used as a spacer element before and after the visible items. @default "div" */
    placeholderComponent?: string;
    /** Ref to the scrollable container element whose scroll position drives the virtual window. */
    containerRef: React.RefObject<HTMLElement>;
    /** The full list of items to virtualize. */
    items: Array<T>;
    /** Renders a single item given the item value and its absolute index in `items`. */
    renderItem: (item: T, index: number) => React.ReactNode;
    /** Fixed pixel size of each item along the scroll axis. */
    itemSize: number;
    /** Scroll axis. */
    direction: "vertical" | "horizontal";
    /** Index of the item to scroll into view when it changes. @default 0 */
    startIndex?: number;
    /** Called whenever the visible range changes, with the new first and last visible indices. */
    onScroll?: (newStartIndex: number, newEndIndex: number) => void;
};

const DEFAULT_PROPS = {
    placeholderComponent: "div",
    startIndex: 0,
} satisfies Partial<VirtualizationProps<any>>;

export function Virtualization(props: VirtualizationProps) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const { onScroll } = defaultedProps;

    const containerSize = useElementSize(defaultedProps.containerRef);

    // Ref to avoid unnecessary callbacks
    const lastScrolledRange = React.useRef({ start: -1, end: -1 });
    const [range, setRange] = React.useState<{ start: number; end: number }>({
        start: defaultedProps.startIndex,
        end: 0,
    });

    const placeholderSizes = React.useMemo(() => {
        return {
            start: range.start * defaultedProps.itemSize,
            end: (defaultedProps.items.length - range.end - 1) * defaultedProps.itemSize,
        };
    }, [defaultedProps.itemSize, defaultedProps.items.length, range.end, range.start]);

    React.useEffect(
        // As the top index changes, scroll the index into view
        function scrollToStartIndexEffect() {
            if (!defaultedProps.containerRef.current || defaultedProps.startIndex === undefined) return;

            const scrollSide = defaultedProps.direction === "horizontal" ? "scrollLeft" : "scrollTop";

            // ! This will trigger the onScroll event handler
            // eslint-disable-next-line react-hooks/immutability -- Current version of eslint doesn't properly recognize ref objects as mutable
            defaultedProps.containerRef.current[scrollSide] = Math.max(
                0,
                defaultedProps.startIndex * defaultedProps.itemSize,
            );
        },
        [defaultedProps.containerRef, defaultedProps.direction, defaultedProps.itemSize, defaultedProps.startIndex],
    );

    React.useEffect(
        function mountScrollEffect() {
            function handleScroll() {
                if (defaultedProps.containerRef.current) {
                    // When the container is hidden (e.g. display:none),
                    // scrollTop reads as 0. Skip range updates in that state so we don't
                    // overwrite a valid scroll position that the browser will restore on
                    // re-display.
                    if (!elementIsVisible(defaultedProps.containerRef.current)) {
                        return;
                    }

                    const scrollPosition =
                        defaultedProps.direction === "vertical"
                            ? defaultedProps.containerRef.current.scrollTop
                            : defaultedProps.containerRef.current.scrollLeft;

                    const size = defaultedProps.direction === "vertical" ? containerSize.height : containerSize.width;

                    const newRange = {
                        start: Math.max(0, Math.floor(scrollPosition / defaultedProps.itemSize) - 1),
                        end: Math.min(
                            defaultedProps.items.length - 1,
                            Math.ceil((scrollPosition + size) / defaultedProps.itemSize),
                        ),
                    };

                    if (!isEqual(newRange, lastScrolledRange.current)) {
                        lastScrolledRange.current = newRange;
                        setRange(newRange);
                        onScroll?.(newRange.start, newRange.end);
                    }
                }
            }

            if (defaultedProps.containerRef.current) {
                defaultedProps.containerRef.current.addEventListener("scroll", handleScroll);
            }

            // Run once to give initial scroll values
            handleScroll();

            return function unmountScrollEffect() {
                if (defaultedProps.containerRef.current) {
                    defaultedProps.containerRef.current.removeEventListener("scroll", handleScroll);
                }
            };
        },
        [
            defaultedProps.containerRef,
            defaultedProps.direction,
            defaultedProps.items,
            defaultedProps.itemSize,
            containerSize.height,
            containerSize.width,
            onScroll,
        ],
    );

    function makeStyle(size: number) {
        if (defaultedProps.direction === "vertical") {
            return { height: size };
        } else {
            return { width: size };
        }
    }

    return (
        <>
            {placeholderSizes.start > 0 &&
                React.createElement(defaultedProps.placeholderComponent, { style: makeStyle(placeholderSizes.start) })}
            {defaultedProps.items
                .slice(range.start, range.end + 1)
                .map((item, index) => defaultedProps.renderItem(item, range.start + index))}
            {placeholderSizes.end > 0 &&
                React.createElement(defaultedProps.placeholderComponent, { style: makeStyle(placeholderSizes.end) })}
        </>
    );
}
