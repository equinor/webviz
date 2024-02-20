import React from "react";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

type ResizablePanelsProps = {
    id: string;
    direction: "horizontal" | "vertical";
    children: React.ReactNode[];
    initialSizesPercent?: number[];
    minSizes?: number[];
    sizesInPercent?: number[];
    onSizesChange?: (sizesInPercent: number[]) => void;
    visible?: boolean[];
};

function loadConfigurationFromLocalStorage(id: string): number[] | undefined {
    const configuration = localStorage.getItem(`resizable-panels-${id}`);
    if (configuration) {
        return JSON.parse(configuration);
    }
    return undefined;
}

function storeConfigurationInLocalStorage(id: string, sizes: number[]) {
    localStorage.setItem(`resizable-panels-${id}`, JSON.stringify(sizes));
}

type DragBarProps = {
    direction: "horizontal" | "vertical";
    index: number;
    isDragging: boolean;
};

const DragBar: React.FC<DragBarProps> = (props) => {
    return (
        <div
            className={resolveClassNames(
                "border border-solid relative z-40 transition-colors ease-in-out duration-100 hover:border-blue-600 hover:bg-blue-600 touch-none",
                {
                    "border-blue-600 bg-blue-600": props.isDragging,
                    "border-transparent bg-gray-300": !props.isDragging,
                    "cursor-ew-resize w-px": props.direction === "horizontal",
                    "cursor-ns-resize h-px": props.direction === "vertical",
                }
            )}
        >
            <div
                data-handle={props.index}
                className={resolveClassNames("z-40 touch-none absolute bg-transparent", {
                    "cursor-ew-resize w-5 -left-2 top-0 h-full": props.direction === "horizontal",
                    "cursor-ns-resize h-5 left-0 -top-2 w-full": props.direction === "vertical",
                })}
            />
        </div>
    );
};

export const ResizablePanels: React.FC<ResizablePanelsProps> = (props) => {
    const { onSizesChange } = props;

    if (props.minSizes && props.minSizes.length !== props.children.length) {
        throw new Error("minSizes must have the same length as children");
    }

    if (props.visible && props.visible.length !== props.children.length) {
        throw new Error("visible must have the same length as children");
    }

    function getInitialSizes() {
        if (props.sizesInPercent) {
            return props.sizesInPercent;
        }
        const loadedSizes = loadConfigurationFromLocalStorage(props.id);
        if (loadedSizes) {
            return loadedSizes;
        }
        if (props.initialSizesPercent) {
            return props.initialSizesPercent;
        }
        return Array(props.children.length).fill(1.0 / props.children.length);
    }

    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [sizes, setSizes] = React.useState<number[]>(getInitialSizes);
    const [prevSizes, setPrevSizes] = React.useState<number[]>(sizes);
    const [prevNumChildren, setPrevNumChildren] = React.useState<number>(props.children.length);

    const resizablePanelsRef = React.useRef<HTMLDivElement | null>(null);
    const individualPanelRefs = React.useRef<(HTMLDivElement | null)[]>([]);

    const { width: totalWidth, height: totalHeight } = useElementSize(resizablePanelsRef);

    if (props.sizesInPercent && !isEqual(props.sizesInPercent, prevSizes)) {
        setSizes(props.sizesInPercent);
        setPrevSizes(props.sizesInPercent);
    }

    if (props.children.length !== prevNumChildren) {
        individualPanelRefs.current = individualPanelRefs.current.slice(0, props.children.length);
        setPrevNumChildren(props.children.length);
    }

    React.useEffect(() => {
        let changedSizes: number[] = [];
        let dragging = false;
        let index = 0;

        function handlePointerDown(e: PointerEvent) {
            if (e.target instanceof HTMLElement && e.target.dataset.handle) {
                index = parseInt(e.target.dataset.handle, 10);
                dragging = true;
                setIsDragging(true);
                e.preventDefault();

                addEventListeners();
            }
        }

        function containSizesWithinBounds(sizes: number[]): number[] {
            if (props.minSizes === undefined) {
                return sizes;
            }

            const adjustedSizes: number[] = [];
            for (let i = 0; i < sizes.length; i++) {
                if (props.minSizes[i] === undefined && sizes[i] < props.minSizes[i]) {
                    adjustedSizes.push(0);
                    continue;
                }

                adjustedSizes.push(sizes[i]);
            }

            return adjustedSizes;
        }

        function handlePointerMove(e: PointerEvent) {
            if (!dragging) {
                return;
            }

            // Prevent any scrolling on touch devices
            e.preventDefault();
            e.stopPropagation();

            let totalSize = 0;
            if (props.direction === "horizontal") {
                totalSize = resizablePanelsRef.current?.getBoundingClientRect().width || 0;
            } else if (props.direction === "vertical") {
                totalSize = resizablePanelsRef.current?.getBoundingClientRect().height || 0;
            }

            const firstElementBoundingRect = individualPanelRefs.current[index]?.getBoundingClientRect();
            const secondElementBoundingRect = individualPanelRefs.current[index + 1]?.getBoundingClientRect();

            if (firstElementBoundingRect && secondElementBoundingRect) {
                setSizes((prev) => {
                    const minSizesToggleVisibilityValue =
                        100 * (props.direction === "horizontal" ? 50 / totalWidth : 50 / totalHeight);

                    const newSizes = prev.map((size, i) => {
                        if (i === index) {
                            let newSize = e.clientX - firstElementBoundingRect.left;
                            if (props.direction === "vertical") {
                                newSize = e.clientY - firstElementBoundingRect.top;
                            }
                            return Math.max((newSize / totalSize) * 100, 0);
                        }
                        if (i === index + 1) {
                            let newSize =
                                secondElementBoundingRect.right - Math.max(firstElementBoundingRect.left, e.clientX);
                            if (props.direction === "vertical") {
                                newSize =
                                    secondElementBoundingRect.bottom -
                                    Math.max(firstElementBoundingRect.top, e.clientY);
                            }
                            return Math.max((newSize / totalSize) * 100, 0);
                        }
                        return size;
                    }) as number[];

                    const adjustedSizes: number[] = [...newSizes];

                    for (let i = 0; i < newSizes.length; i++) {
                        const minSizeInPercent = ((props.minSizes?.at(i) || 0) / totalWidth) * 100;

                        if (props.visible?.at(i) === false) {
                            adjustedSizes[i] = 0;
                            if (i < newSizes.length - 1) {
                                adjustedSizes[i + 1] = adjustedSizes[i + 1] + newSizes[i];
                            } else {
                                adjustedSizes[i - 1] = adjustedSizes[i - 1] + newSizes[i];
                            }
                        }
                        if (newSizes[i] < minSizesToggleVisibilityValue) {
                            adjustedSizes[i] = 0;
                            if (i < newSizes.length - 1) {
                                adjustedSizes[i + 1] = adjustedSizes[i + 1] + newSizes[i];
                            } else {
                                adjustedSizes[i - 1] = adjustedSizes[i - 1] + newSizes[i];
                            }
                        } else if (newSizes[i] < minSizeInPercent) {
                            adjustedSizes[i] = minSizeInPercent;

                            if (i < newSizes.length - 1) {
                                adjustedSizes[i + 1] = newSizes[i + 1] + newSizes[i] - minSizeInPercent;
                            } else {
                                adjustedSizes[i - 1] = adjustedSizes[i - 1] + newSizes[i] - minSizeInPercent;
                            }
                        }
                    }

                    changedSizes = adjustedSizes;

                    return adjustedSizes;
                });
            }
        }

        function handlePointerUp() {
            if (!dragging) {
                return;
            }
            storeConfigurationInLocalStorage(props.id, changedSizes);
            dragging = false;
            setIsDragging(false);
            if (onSizesChange) {
                onSizesChange(containSizesWithinBounds(changedSizes));
            }
            removeEventListeners();
        }

        function addEventListeners() {
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);
            document.addEventListener("blur", handlePointerUp);
        }

        function removeEventListeners() {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("blur", handlePointerUp);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);

            removeEventListeners();
        };
    }, [props.direction, props.id, props.minSizes, onSizesChange, totalWidth, totalHeight, props.visible]);

    function maybeMakeDragBar(index: number) {
        if (index < props.children.length - 1) {
            return <DragBar direction={props.direction} index={index} isDragging={isDragging} />;
        }
        return null;
    }

    function makeStyle(index: number): React.CSSProperties {
        const style: React.CSSProperties = {};
        const minSizesToggleVisibilityValue =
            100 * (props.direction === "horizontal" ? 50 / totalWidth : 50 / totalHeight);
        if (props.direction === "horizontal") {
            style.width = `calc(${sizes[index]}% - 3px)`;
            if (props.visible?.at(index) === false || sizes[index] < minSizesToggleVisibilityValue) {
                style.minWidth = 0;
            } else {
                style.minWidth = props.minSizes?.at(index) || 0;
            }

            if (sizes[index] < minSizesToggleVisibilityValue && props.minSizes?.at(index)) {
                style.maxWidth = 0;
            } else if (props.visible?.at(index) === false) {
                style.maxWidth = 0;
            } else {
                style.maxWidth = undefined;
            }
        } else {
            style.height = `calc(${sizes[index]}% - 3px)`;
            if (props.visible?.at(index) === false || sizes[index] < minSizesToggleVisibilityValue) {
                style.minHeight = 0;
            } else {
                style.minHeight = props.minSizes?.at(index) || 0;
            }

            if (sizes[index] < minSizesToggleVisibilityValue && props.minSizes?.at(index)) {
                style.maxHeight = 0;
            } else if (props.visible?.at(index) === false) {
                style.maxHeight = 0;
            } else {
                style.maxHeight = undefined;
            }
        }

        return style;
    }

    return (
        <div
            className={resolveClassNames(
                "flex",
                props.direction === "horizontal" ? "flex-row" : "flex-col",
                "w-full",
                "h-full",
                "relative",
                "align-stretch"
            )}
            ref={resizablePanelsRef}
        >
            <div
                className={resolveClassNames(
                    "absolute",
                    props.direction === "horizontal" ? "cursor-ew-resize" : "cursor-ns-resize",
                    "z-50",
                    "bg-transparent"
                )}
                style={{
                    width: totalWidth,
                    height: totalHeight,
                    display: isDragging ? "block" : "none",
                }}
            />
            {props.children.map((el: React.ReactNode, index: number) => (
                /* eslint-disable react/no-array-index-key */
                <React.Fragment key={`resizable-panel-${index}`}>
                    <div
                        className="flex-grow overflow-hidden"
                        /* eslint-disable no-return-assign */
                        ref={(element) => (individualPanelRefs.current[index] = element)}
                        style={makeStyle(index)}
                    >
                        {el}
                    </div>
                    {maybeMakeDragBar(index)}
                </React.Fragment>
            ))}
        </div>
    );
};

ResizablePanels.displayName = "ResizablePanels";
