import type { LayoutElement } from "@framework/internal/Dashboard";
import type { Size2D } from "@lib/utils/geometry";

export function convertLayoutRectToRealRect(el: LayoutElement, size: Size2D) {
    return {
        x: el.relX * size.width,
        y: el.relY * size.height,
        width: el.relWidth * size.width,
        height: el.relHeight * size.height,
    };
}
