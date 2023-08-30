import React from "react";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

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
    const [currentIndex, setCurrentIndex] = React.useState<number>(0);
    const [sizes, setSizes] = React.useState<number[]>(
        props.sizesInPercent ||
            loadConfigurationFromLocalStorage(props.id) ||
            props.initialSizesPercent ||
            Array(props.children.length).fill(1.0 / props.children.length)
    );

    const resizablePanelsRef = React.useRef<HTMLDivElement | null>(null);
    const resizablePanelRefs = React.useRef<(HTMLDivElement | null)[]>([]);

    const { width: totalWidth, height: totalHeight } = useElementSize(resizablePanelsRef);

    React.useEffect(() => {
        if (props.sizesInPercent) {
            setSizes(props.sizesInPercent);
        }
    }, [props.sizesInPercent]);

    React.useEffect(() => {
        resizablePanelRefs.current = resizablePanelRefs.current.slice(0, props.children.length);
    }, [props.children.length]);

    const startResize = React.useCallback(
        (index: number) => {
            window.addEventListener("selectstart", (e) => e.preventDefault());
            setCurrentIndex(index);
            setIsDragging(true);
        },
        [setCurrentIndex, setIsDragging]
    );

    React.useEffect(() => {
        let resize: ((e: PointerEvent) => void) | undefined;
        if (props.direction === "horizontal") {
            resize = (event: PointerEvent) => {
                if (!isDragging) {
                    return;
                }
                const totalSize = resizablePanelsRef.current?.getBoundingClientRect().width || 0;
                const firstElement = resizablePanelRefs.current[currentIndex];
                const secondElement = resizablePanelRefs.current[currentIndex + 1];
                if (firstElement && secondElement) {
                    const newSizes = sizes.map((size, index) => {
                        if (index === currentIndex) {
                            const newSize = event.clientX - firstElement.getBoundingClientRect().left;
                            return (newSize / totalSize) * 100;
                        }
                        if (index === currentIndex + 1) {
                            const newSize = secondElement.getBoundingClientRect().right - event.clientX;
                            return (newSize / totalSize) * 100;
                        }
                        return size;
                    }) as number[];
                    setSizes(newSizes);
                    if (props.onSizesChange) {
                        props.onSizesChange(newSizes);
                    }
                }
            };
        } else if (props.direction === "vertical") {
            resize = (event: PointerEvent) => {
                if (!isDragging) {
                    return;
                }
                const totalSize = resizablePanelsRef.current?.getBoundingClientRect().height || 0;
                const firstElement = resizablePanelRefs.current[currentIndex];
                const secondElement = resizablePanelRefs.current[currentIndex + 1];
                if (firstElement && secondElement) {
                    const newSizes = sizes.map((size, index) => {
                        if (index === currentIndex) {
                            const newSize = event.clientY - firstElement.getBoundingClientRect().top;
                            return (newSize / totalSize) * 100;
                        }
                        if (index === currentIndex + 1) {
                            const newSize = secondElement.getBoundingClientRect().bottom - event.clientY;
                            return (newSize / totalSize) * 100;
                        }
                        return size;
                    }) as number[];
                    setSizes(newSizes);
                    if (props.onSizesChange) {
                        props.onSizesChange(newSizes);
                    }
                }
            };
        }

        if (!resize) {
            return;
        }

        const stopResize = () => {
            window.removeEventListener("selectstart", (e) => e.preventDefault());
            if (isDragging) {
                storeConfigurationInLocalStorage(props.id, sizes);
            }
            setIsDragging(false);
        };
        document.addEventListener("pointermove", resize);
        document.addEventListener("pointerup", stopResize);

        return () => {
            if (resize) {
                document.removeEventListener("pointermove", resize);
            }
            document.removeEventListener("pointerup", stopResize);
        };
    }, [isDragging, setIsDragging, sizes, setSizes, props.direction, currentIndex, props.id, props.onSizesChange]);

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
                                "hover:bg-blue-600"
                            )}
                            onPointerDown={() => startResize(index)}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

ResizablePanels.displayName = "ResizablePanels";
