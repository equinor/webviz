export function getTextWidthWithElement(text: string, element: HTMLElement): number {
    // re-use canvas object for better performance
    const font = getCanvasFont(element);
    return getTextWidthWithFont(text, font);
}

export function getTextWidthWithFont(text: string, font: string): number {
    // re-use canvas object for better performance
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    let textWidth = 0;
    if (context) {
        context.font = font;
        const metrics = context.measureText(text);
        textWidth = metrics.width;
    }
    return textWidth;
}

function getCssStyle(element: HTMLElement, property: string): string {
    return window.getComputedStyle(element, null).getPropertyValue(property);
}

function getCanvasFont(element: HTMLElement): string {
    const fontWeight = getCssStyle(element, "font-weight") || "normal";
    const fontSize = getCssStyle(element, "font-size") || "16px";
    const fontFamily = getCssStyle(element, "font-family") || "Times New Roman";

    return `${fontWeight} ${fontSize} ${fontFamily}`;
}
