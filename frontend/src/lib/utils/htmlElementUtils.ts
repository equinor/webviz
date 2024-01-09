export function elementIsVisible(element: HTMLElement): boolean {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}
