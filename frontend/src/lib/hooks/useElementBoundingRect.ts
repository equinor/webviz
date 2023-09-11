import React from "react";

export function useElementBoundingRect(ref: React.RefObject<HTMLElement>): DOMRect {
    const [rect, setRect] = React.useState<DOMRect>(new DOMRect(0, 0, 0, 0));

    React.useLayoutEffect(() => {
        const handleResize = (): void => {
            if (ref.current) {
                const boundingClientRect = ref.current.getBoundingClientRect();
                setRect(boundingClientRect);
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", handleResize, true);

        if (ref.current) {
            handleResize();
            resizeObserver.observe(ref.current);
        }

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleResize, true);
        };
    }, [ref]);

    return rect;
}
