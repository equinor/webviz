export function gridColorScaleValues(valueRange: [number, number]): { min: number; max: number; mid: number } {
    const min = valueRange[0];
    const max = valueRange[1];
    const mid = min + (max - min) / 2;
    return { min, max, mid };
}

export function seismicColorScaleValues(valueRange: [number, number]): { min: number; max: number; mid: number } {
    const min = Math.min(0.0, valueRange[0]);
    const max = Math.max(0.0, valueRange[1]);
    const mid = 0;
    return { min, max, mid };
}
