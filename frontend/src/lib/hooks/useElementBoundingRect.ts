import React from "react";

import { domRectsAreEqual } from "@lib/utils/geometry";
import { elementIsVisible } from "@lib/utils/htmlElementUtils";

export function useElementBoundingRect(ref: React.RefObject<HTMLElement | SVGSVGElement>): DOMRect {
    const [rect, setRect] = React.useState<DOMRect>(new DOMRect(0, 0, 0, 0));

    React.useEffect(
        function onMountEffect() {
            let isHidden = false;
            let currentRect = new DOMRect(0, 0, 0, 0);
            let intersectionObserver: IntersectionObserver | null = null;

            function handleRectChange() {
                intersectionObserver?.disconnect();
                if (ref.current) {
                    const rect = ref.current.getBoundingClientRect();
                    const margins = `${-Math.round(rect.top)}px ${-Math.round(rect.right)}px ${-Math.round(rect.bottom)}px ${-Math.round(rect.left)}px`;

                    intersectionObserver = new IntersectionObserver(handleRectChange, {
                        root: document.body,
                        rootMargin: margins,
                    });

                    intersectionObserver.observe(ref.current);

                    // If element is not visible do not change size as it might be expensive to render
                    if (!isHidden && !elementIsVisible(ref.current)) {
                        isHidden = true;
                        return;
                    }

                    isHidden = false;

                    if (domRectsAreEqual(currentRect, rect)) {
                        return;
                    }

                    currentRect = rect;
                    setRect(rect);
                }
            }

            const resizeObserver = new ResizeObserver(handleRectChange);
            const mutationObserver = new MutationObserver(handleRectChange);
            window.addEventListener("resize", handleRectChange, true);
            window.addEventListener("scroll", handleRectChange, true);

            if (ref.current) {
                resizeObserver.observe(document.body);
                mutationObserver.observe(ref.current, {
                    attributes: true,
                    subtree: false,
                    childList: false,
                    attributeFilter: ["style", "class"],
                });
                handleRectChange();
            }

            return function onUnmount() {
                resizeObserver.disconnect();
                intersectionObserver?.disconnect();
                mutationObserver.disconnect();
                window.removeEventListener("resize", handleRectChange, true);
                window.removeEventListener("scroll", handleRectChange, true);
            };
        },
        [ref],
    );

    return rect;
}
