import React from "react";

export function useElementBoundingRect(ref: React.RefObject<HTMLElement | SVGSVGElement>): DOMRect {
    const [rect, setRect] = React.useState<DOMRect>(new DOMRect(0, 0, 0, 0));

    React.useEffect(() => {
        const handleResize = (): void => {
            if (ref.current) {
                const boundingClientRect = ref.current.getBoundingClientRect();
                setRect(boundingClientRect);
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        const mutationObserver = new MutationObserver(handleResize);
        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", handleResize, true);

        if (ref.current) {
            handleResize();
            resizeObserver.observe(ref.current);
            if (ref.current.parentElement) {
                mutationObserver.observe(ref.current.parentElement, { childList: true, subtree: true });
            }
        }

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleResize, true);
        };
    }, [ref]);

    return rect;
}
