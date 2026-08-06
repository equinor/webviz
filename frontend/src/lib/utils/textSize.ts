let _canvas: HTMLCanvasElement | null = null;

function getCanvas(): CanvasRenderingContext2D | null {
    if (!_canvas) {
        _canvas = document.createElement("canvas");
    }
    return _canvas.getContext("2d");
}

export function getTextWidthWithFont(text: string, font: string, sizeInRem: number): number {
    const ctx = getCanvas();
    if (!ctx) return 0;
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    ctx.font = `${sizeInRem * rootPx}px ${font}`;
    return ctx.measureText(text).width;
}

/**
 * Measure text width using the exact computed CSS font of a DOM element.
 * This is the only way to get a pixel-accurate result when font-size, font-weight,
 * or font-family come from CSS variables or design tokens.
 */
export function measureTextWidthWithElement(text: string, element: Element): number {
    const ctx = getCanvas();
    if (!ctx) return 0;
    ctx.font = getComputedStyle(element).font;
    return ctx.measureText(text).width;
}
