type CharWidths = Map<string, number>;

const text = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.!~*'()[]{}/?:@#$%^&*+=`|\\\"<>";
const storedFontWidths: Map<string, CharWidths> = new Map();

function calcAndStoreCharWidths(font: string) {
    const charWidths: CharWidths = new Map();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context) {
        context.font = `1rem ${font}`;
        for (const char of text) {
            const metrics = context.measureText(char);
            charWidths.set(char, metrics.width);
        }
    }
    storedFontWidths.set(font, charWidths);
    canvas.remove();
    return charWidths;
}

export function getTextWidthWithElement(text: string, element: HTMLElement): number {
    // re-use canvas object for better performance
    const font = getCanvasFont(element);
    return getTextWidthWithFont(text, font, 1);
}

export function getTextWidthWithFont(text: string, font: string, sizeInRem: number): number {
    let charWidths = storedFontWidths.get(font);
    if (!charWidths) {
        charWidths = calcAndStoreCharWidths(font);
    }

    let width = 0;
    for (const char of text) {
        const charWidth = charWidths.get(char);
        if (charWidth) {
            width += charWidth * sizeInRem;
        } else {
            width += 1 * sizeInRem;
        }
    }
    return width;
}
