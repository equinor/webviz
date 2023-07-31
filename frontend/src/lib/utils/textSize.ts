export function getTextWidth(text: string, element: HTMLElement): number {
    // re-use canvas object for better performance
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    let textWidth = 0;
    if (context) {
        context.font = getCanvasFont(element);
        const metrics = context.measureText(text);
        textWidth = metrics.width;
    }
    return textWidth;
}

function getCssStyle(element: HTMLElement, property: string) {
    return window.getComputedStyle(element, null).getPropertyValue(property);
}

function getCanvasFont(element: HTMLElement) {
    const fontWeight = getCssStyle(element, "font-weight") || "normal";
    const fontSize = getCssStyle(element, "font-size") || "16px";
    const fontFamily = getCssStyle(element, "font-family") || "Times New Roman";

    return `${fontWeight} ${fontSize} ${fontFamily}`;
}
