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
