import React from "react";

import { domRectsAreEqual } from "@lib/utils/geometry";
import { elementIsVisible } from "@lib/utils/htmlElementUtils";

export function useElementBoundingRect(ref: React.RefObject<HTMLElement | SVGSVGElement>): DOMRect {
    const [rect, setRect] = React.useState<DOMRect>(new DOMRect(0, 0, 0, 0));

    React.useEffect(() => {
        let isHidden = false;
        let currentRect = new DOMRect(0, 0, 0, 0);

        const handleResize = (): void => {
            if (ref.current) {
                // If element is not visible do not change size as it might be expensive to render
                if (!elementIsVisible(ref.current)) {
                    isHidden = true;
                    return;
                }

                const newRect = ref.current.getBoundingClientRect();

                if (isHidden && domRectsAreEqual(currentRect, newRect)) {
                    isHidden = false;
                    return;
                }

                currentRect = newRect;

                setRect(newRect);
            }
        };

        function handleIntersectionChange(entries: IntersectionObserverEntry[]): void {
            if (entries[0]) {
                setRect(entries[0].boundingClientRect);
            }
        }

        const resizeObserver = new ResizeObserver(handleResize);
        const intersectionObserver = new IntersectionObserver(handleIntersectionChange);
        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", handleResize, true);

        if (ref.current) {
            handleResize();
            resizeObserver.observe(ref.current);
            if (ref.current.parentElement) {
                intersectionObserver.observe(ref.current);
            }
        }

        return () => {
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleResize, true);
        };
    }, [ref]);

    return rect;
}
