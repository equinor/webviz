import React from "react";

export type UseIsVisibleProps = {
    ref: React.RefObject<HTMLElement | null> | null;
};

/**
 * Hook that checks if an element is visible (mounted and not hidden).
 * Visible means the element is in the DOM and not hidden via:
 * - hidden attribute
 * - display: none
 * - visibility: hidden
 *
 * The element can be scrolled out of view and still be considered visible.
 *
 * @returns {boolean} The visibility state of the element
 */
export function useIsVisible({ ref }: UseIsVisibleProps): boolean {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(
        function onMountEffect() {
            const element = ref?.current;
            if (!element) {
                setIsVisible(false);
                return;
            }

            const checkVisibility = () => {
                let currentElement: HTMLElement | null = element;

                while (currentElement) {
                    if (currentElement.hasAttribute("hidden")) {
                        setIsVisible(false);
                        return;
                    }

                    const styles = window.getComputedStyle(currentElement);

                    if (styles.display === "none") {
                        setIsVisible(false);
                        return;
                    }

                    if (styles.visibility === "hidden") {
                        setIsVisible(false);
                        return;
                    }

                    currentElement = currentElement.parentElement;
                }

                setIsVisible(true);
            };

            // Initial check
            checkVisibility();

            // Poll every 500ms (adjust as needed)
            const intervalId = setInterval(checkVisibility, 500);

            return function cleanUp() {
                clearInterval(intervalId);
            };
        },
        [ref],
    );

    return isVisible;
}
