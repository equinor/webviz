export function elementIsVisible(element: HTMLElement | SVGSVGElement): boolean {
    if (element instanceof HTMLElement) {
        return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    }
    return (
        element.getClientRects() &&
        element.getBoundingClientRect().width > 0 &&
        element.getBoundingClientRect().height > 0
    );
}
