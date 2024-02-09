const REM_IN_PX = parseFloat(getComputedStyle(document.documentElement).fontSize);

export function convertRemToPixels(rem: number): number {
    return rem * REM_IN_PX;
}
