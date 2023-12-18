import React from "react";

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
};

const defaultProps = {
    placeholderComponent: "div",
    startIndex: 0,
};

type VirtualizationPropsSubset = Pick<VirtualizationProps, "items" | "startIndex" | "direction" | "itemSize"> | null;

function checkEqualityOfProps(a: VirtualizationPropsSubset, b: VirtualizationPropsSubset): boolean {
    if (a === null && b === null) {
        return true;
    }

    if (a === null || b === null) {
        return false;
    }

    return (
        a.itemSize === b.itemSize &&
        a.direction === b.direction &&
        a.startIndex === b.startIndex &&
        a.items.length === b.items.length
    );
}

export const Virtualization = withDefaults<VirtualizationProps>()(defaultProps, (props) => {
    const [range, setRange] = React.useState<{ start: number; end: number }>({ start: props.startIndex, end: 0 });
    const [prevPropsSubset, setPrevPropsSubset] = React.useState<VirtualizationPropsSubset>(null);
    const [placeholderSizes, setPlaceholderSizes] = React.useState<{ start: number; end: number }>({
        start: props.startIndex * props.itemSize,
        end: 0,
    });
    const [initialScrollPositions, setInitialScrollPositions] = React.useState<
        | {
              top: number;
              left: number;
          }
        | undefined
    >(undefined);

    const containerSize = useElementSize(props.containerRef);

    const currentPropsSubset = {
        items: props.items,
        startIndex: props.startIndex,
        direction: props.direction,
        itemSize: props.itemSize,
    };

    if (!checkEqualityOfProps(prevPropsSubset, currentPropsSubset)) {
        if (props.containerRef.current) {
            const newInitialScrollPositions = {
                top: props.startIndex * props.itemSize,
                left: props.startIndex * props.itemSize,
            };
            let size = containerSize.height;
            let scrollPosition = newInitialScrollPositions?.top || 0;
            if (props.direction === "horizontal") {
                size = containerSize.width;
                scrollPosition = newInitialScrollPositions?.left || 0;
            }

            const startIndex = Math.max(0, Math.floor(scrollPosition / props.itemSize) - 1);
            const endIndex = Math.min(props.items.length - 1, Math.ceil((scrollPosition + size) / props.itemSize) + 1);

            setRange({ start: startIndex, end: endIndex });
            setPlaceholderSizes({
                start: startIndex * props.itemSize,
                end: (props.items.length - 1 - endIndex) * props.itemSize,
            });
            setInitialScrollPositions(newInitialScrollPositions);
            setPrevPropsSubset({
                items: props.items,
                startIndex: props.startIndex,
                direction: props.direction,
                itemSize: props.itemSize,
            });
        }
    }

    React.useEffect(() => {
        if (props.containerRef.current && initialScrollPositions) {
            props.containerRef.current.scrollTop = initialScrollPositions.top;
            props.containerRef.current.scrollLeft = initialScrollPositions.left;
        }
    }, [props.containerRef, initialScrollPositions]);

    React.useEffect(() => {
        let lastScrollPosition = -1;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const handleScroll = () => {
            if (props.containerRef.current) {
                const scrollPosition =
                    props.direction === "vertical"
                        ? props.containerRef.current.scrollTop
                        : props.containerRef.current.scrollLeft;

                if (scrollPosition === lastScrollPosition) {
                    return;
                }

                lastScrollPosition = scrollPosition;

                const size = props.direction === "vertical" ? containerSize.height : containerSize.width;

                const startIndex = Math.max(0, Math.floor(scrollPosition / props.itemSize) - 1);
                const endIndex = Math.min(
                    props.items.length - 1,
                    Math.ceil((scrollPosition + size) / props.itemSize) + 1
                );

                setRange({ start: startIndex, end: endIndex });
                setPlaceholderSizes({
                    start: startIndex * props.itemSize,
                    end: (props.items.length - 1 - endIndex) * props.itemSize,
                });
            }
        };

        if (props.containerRef.current) {
            props.containerRef.current.addEventListener("scroll", handleScroll);
            timer = setTimeout(handleScroll, 1000);
        }
        handleScroll();

        return () => {
            if (props.containerRef.current) {
                props.containerRef.current.removeEventListener("scroll", handleScroll);
                if (timer) {
                    clearTimeout(timer);
                }
            }
        };
    }, [props.containerRef, props.direction, props.items, props.itemSize, containerSize.height, containerSize.width]);

    const makeStyle = (size: number) => {
        if (props.direction === "vertical") {
            return { height: size };
        } else {
            return { width: size };
        }
    };

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
