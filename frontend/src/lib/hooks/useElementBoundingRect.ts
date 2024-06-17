import React from "react";

import { domRectsAreEqual } from "@lib/utils/geometry";
import { elementIsVisible } from "@lib/utils/htmlElementUtils";

export function useElementBoundingRect(ref: React.RefObject<HTMLElement | SVGSVGElement>): DOMRect {
    const [rect, setRect] = React.useState<DOMRect>(new DOMRect(0, 0, 0, 0));

    React.useEffect(() => {
        let isHidden = false;
        let currentRect = new DOMRect(0, 0, 0, 0);

        const handleResizeAndScroll = (): void => {
            if (ref.current) {
                // If element is not visible do not change size as it might be expensive to render
                if (!isHidden && !elementIsVisible(ref.current)) {
                    isHidden = true;
                    return;
                }

                const newRect = ref.current.getBoundingClientRect();

                if (domRectsAreEqual(currentRect, newRect)) {
                    isHidden = false;
                    return;
                }

                currentRect = newRect;

                setRect(newRect);
            }
        };

        function handleMutations(): void {
            if (ref.current) {
                const newRect = ref.current.getBoundingClientRect();

                if (!domRectsAreEqual(currentRect, newRect)) {
                    currentRect = newRect;
                    setRect(newRect);
                }
            }
        }

        const resizeObserver = new ResizeObserver(handleResizeAndScroll);
        const mutationObserver = new MutationObserver(handleMutations);
        window.addEventListener("resize", handleResizeAndScroll, true);
        window.addEventListener("scroll", handleResizeAndScroll, true);

        if (ref.current) {
            handleResizeAndScroll();
            resizeObserver.observe(ref.current);
            mutationObserver.observe(ref.current, {
                attributes: true,
                subtree: false,
                childList: false,
                attributeFilter: ["style", "class"],
            });
        }

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener("resize", handleResizeAndScroll, true);
            window.removeEventListener("scroll", handleResizeAndScroll, true);
        };
    }, [ref]);

    return rect;
}
