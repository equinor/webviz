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

export const ResizablePanels: React.FC<ResizablePanelsProps> = (props) => {
    if (props.minSizes && props.minSizes.length !== props.children.length) {
        throw new Error("minSizes must have the same length as children");
    }

    if (props.visible && props.visible.length !== props.children.length) {
        throw new Error("visible must have the same length as children");
    }

    const [isDragging, setIsDragging] = React.useState<boolean>();
    const [sizes, setSizes] = React.useState<number[]>(
        props.sizesInPercent ||
            loadConfigurationFromLocalStorage(props.id) ||
            props.initialSizesPercent ||
            Array(props.children.length).fill(1.0 / props.children.length)
    );
    const [prevSizes, setPrevSizes] = React.useState<number[]>(sizes);
    const [prevNumChildren, setPrevNumChildren] = React.useState<number>(props.children.length);

    const resizablePanelsRef = React.useRef<HTMLDivElement | null>(null);
    const resizablePanelRefs = React.useRef<(HTMLDivElement | null)[]>([]);

    const { width: totalWidth, height: totalHeight } = useElementSize(resizablePanelsRef);

    if (props.sizesInPercent && !isEqual(props.sizesInPercent, prevSizes)) {
        setSizes(props.sizesInPercent);
        setPrevSizes(props.sizesInPercent);
    }

    if (props.children.length !== prevNumChildren) {
        resizablePanelRefs.current = resizablePanelRefs.current.slice(0, props.children.length);
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
                document.body.classList.add("touch-none");
                e.preventDefault();
            }
        }

        function handlePointerMove(e: PointerEvent) {
            if (!dragging) {
                return;
            }

            let totalSize = 0;
            if (props.direction === "horizontal") {
                totalSize = resizablePanelsRef.current?.getBoundingClientRect().width || 0;
            } else if (props.direction === "vertical") {
                totalSize = resizablePanelsRef.current?.getBoundingClientRect().height || 0;
            }

            const firstElement = resizablePanelRefs.current[index];
            const secondElement = resizablePanelRefs.current[index + 1];

            if (firstElement && secondElement) {
                setSizes((prev) => {
                    const newSizes = prev.map((size, i) => {
                        if (i === index) {
                            const newSize =
                                props.direction === "horizontal"
                                    ? e.clientX - firstElement.getBoundingClientRect().left
                                    : e.clientY - firstElement.getBoundingClientRect().top;
                            return (newSize / totalSize) * 100;
                        }
                        if (i === index + 1) {
                            const newSize =
                                props.direction === "horizontal"
                                    ? secondElement.getBoundingClientRect().right - e.clientX
                                    : secondElement.getBoundingClientRect().bottom - e.clientY;
                            return (newSize / totalSize) * 100;
                        }
                        return size;
                    }) as number[];

                    changedSizes = newSizes;

                    return newSizes;
                });
            }
        }

        function handlePointerUp() {
            if (!dragging) {
                return;
            }
            storeConfigurationInLocalStorage(props.id, sizes);
            dragging = false;
            setIsDragging(false);
            if (props.onSizesChange) {
                props.onSizesChange(changedSizes);
            }
            document.body.classList.remove("touch-none");
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerup", handlePointerUp);
        document.addEventListener("blur", handlePointerUp);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
            document.removeEventListener("blur", handlePointerUp);
        };
    }, [props.direction, props.id, props.onSizesChange]);

    const minSizesToggleVisibilityValue = 100 * (props.direction === "horizontal" ? 50 / totalWidth : 50 / totalHeight);

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
                        ref={(element) => (resizablePanelRefs.current[index] = element)}
                        style={
                            props.direction === "horizontal"
                                ? {
                                      width: `calc(${sizes[index]}% - 3px)`,
                                      minWidth:
                                          props.visible?.at(index) === false
                                              ? 0
                                              : sizes[index] > minSizesToggleVisibilityValue
                                              ? props.minSizes?.at(index) || 0
                                              : 0,
                                      maxWidth:
                                          (sizes[index] < minSizesToggleVisibilityValue && props.minSizes?.at(index)) ||
                                          props.visible?.at(index) === false
                                              ? 0
                                              : undefined,
                                  }
                                : {
                                      height: `calc(${sizes[index]}% - 3px)`,
                                      minHeight:
                                          props.visible?.at(index) === false
                                              ? 0
                                              : sizes[index] > minSizesToggleVisibilityValue
                                              ? props.minSizes?.at(index) || 0
                                              : 0,
                                      maxHeight:
                                          (sizes[index] < minSizesToggleVisibilityValue && props.minSizes?.at(index)) ||
                                          props.visible?.at(index) === false
                                              ? 0
                                              : undefined,
                                  }
                        }
                    >
                        {el}
                    </div>
                    {index < props.children.length - 1 && (
                        <div
                            className={resolveClassNames(
                                "border",
                                "border-solid",
                                isDragging ? "border-blue-600 bg-blue-600" : "border-transparent bg-gray-300",
                                "relative",
                                "z-40",
                                "transition-colors ease-in-out duration-100",
                                props.direction === "horizontal" ? "cursor-ew-resize w-px" : "cursor-ns-resize h-px",
                                "hover:border-blue-600",
                                "hover:bg-blue-600",
                                "touch-none"
                            )}
                        >
                            <div
                                data-handle={index}
                                className={resolveClassNames(
                                    "z-40 touch-none absolute bg-transparent",
                                    props.direction === "horizontal"
                                        ? "cursor-ew-resize w-5 -left-2 top-0 h-full"
                                        : "cursor-ns-resize h-5 left-0 -top-2 w-full"
                                )}
                            />
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

ResizablePanels.displayName = "ResizablePanels";
