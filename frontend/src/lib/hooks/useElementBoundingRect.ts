import React from "react";

import { domRectsAreEqual } from "@lib/utils/geometry";
import { elementIsVisible } from "@lib/utils/htmlElementUtils";

export function useElementBoundingRect(ref: React.RefObject<HTMLElement | SVGSVGElement>): DOMRect {
    const [rect, setRect] = React.useState<DOMRect>(new DOMRect(0, 0, 0, 0));
    const id = React.useId();

    React.useEffect(
        function onMountEffect() {
            let isHidden = false;
            let currentRect = new DOMRect(0, 0, 0, 0);

            let container = document.getElementById("intersection-observables-root");
            if (!container) {
                container = document.createElement("div");
                container.id = "intersection-observables-root";
                document.body.appendChild(container);
            }

            // Create an invisible div that will be used to observe the intersection between the old position (the invisible div)
            // and the new position (the element that we want to observe)
            let element = document.getElementById(id);
            if (!element) {
                element = document.createElement("div");
                element.id = id;
                element.style.visibility = "hidden";
                element.style.position = "absolute";
                element.style.pointerEvents = "none";
                container.appendChild(element);
            }

            function handleResizeAndScroll() {
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

                    maybeUpdateRect(newRect);
                }
            }

            function handleMutations() {
                if (ref.current) {
                    const newRect = ref.current.getBoundingClientRect();
                    maybeUpdateRect(newRect);
                }
            }

            function handleIntersectionChange() {
                if (ref.current) {
                    const newRect = ref.current.getBoundingClientRect();
                    maybeUpdateRect(newRect);
                }
            }

            function maybeUpdateRect(rect: DOMRect) {
                if (!domRectsAreEqual(rect, currentRect)) {
                    currentRect = rect;
                    setRect(rect);
                    element!.style.width = `${rect.width}px`;
                    element!.style.height = `${rect.height}px`;
                    element!.style.top = `${rect.top}px`;
                    element!.style.left = `${rect.left}px`;
                }
            }

            const resizeObserver = new ResizeObserver(handleResizeAndScroll);
            const mutationObserver = new MutationObserver(handleMutations);
            const intersectionObserver = new IntersectionObserver(handleIntersectionChange, { root: element });
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
                intersectionObserver.observe(ref.current);
            }

            return function onUnmount() {
                resizeObserver.disconnect();
                mutationObserver.disconnect();
                intersectionObserver.disconnect();
                window.removeEventListener("resize", handleResizeAndScroll, true);
                window.removeEventListener("scroll", handleResizeAndScroll, true);
                container.removeChild(element);
            };
        },
        [ref, id],
    );

    return rect;
}
