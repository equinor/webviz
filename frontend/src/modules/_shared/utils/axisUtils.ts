export interface AxisTickOptions {
    /** The minimum pixel distance between tick marks to prevent overlap */
    minTickSpacing?: number;
    /** The available length/width in pixels for the axis */
    availableSpace?: number;
    /** Whether to prioritize boundaries (always include min/max) */
    prioritizeBoundaries?: boolean;
}

/**
 * Generates tick values within a given range.
 * This function calculates appropriate step sizes and positions tick marks at
 * round numbers like 0, 0.5, 1, 2, 5, 10, etc. rather than arbitrary decimals.
 *
 * When spacing options are provided, it ensures ticks don't overlap in limited space.
 *
 * @param min The minimum value of the range
 * @param max The maximum value of the range
 * @param maxTicks The maximum number of tick marks to generate
 * @param options Optional spacing and layout options
 * @returns An array of nicely positioned tick values
 *
 * @example
 * // Basic usage:
 * generateNiceAxisTicks(2220.458, 3645.571, 5)
 * // Returns: [2220.458, 2500, 3000, 3500, 3645.571]
 *
 * @example
 * // With spacing constraints:
 * generateNiceAxisTicks(0, 100, 10, { minTickSpacing: 30, availableSpace: 200 })
 * // Returns fewer ticks to prevent overlap
 */

export function generateNiceAxisTicks(min: number, max: number, maxTicks: number, options?: AxisTickOptions): number[] {
    if (min === max) return [min];

    // Handle reversed min/max by swapping them
    const actualMin = Math.min(min, max);
    const actualMax = Math.max(min, max);
    const range = actualMax - actualMin;

    // Apply spacing constraints if provided
    let effectiveMaxTicks = maxTicks;
    if (options?.minTickSpacing && options?.availableSpace) {
        // Calculate maximum ticks that can fit with minimum spacing
        const maxTicksFromSpacing = Math.floor(options.availableSpace / options.minTickSpacing) + 1;
        effectiveMaxTicks = Math.min(maxTicks, maxTicksFromSpacing);

        // Ensure at least 2 ticks (min and max) if space allows
        if (effectiveMaxTicks < 2 && options.availableSpace >= options.minTickSpacing) {
            effectiveMaxTicks = 2;
        }
    }

    // Calculate nice step size using effective max ticks
    const rawStep = range / (effectiveMaxTicks - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalizedStep = rawStep / magnitude;

    let niceStep: number;
    if (normalizedStep <= 1) {
        niceStep = 1 * magnitude;
    } else if (normalizedStep <= 2) {
        niceStep = 2 * magnitude;
    } else if (normalizedStep <= 5) {
        niceStep = 5 * magnitude;
    } else {
        niceStep = 10 * magnitude;
    }

    // Calculate nice min and max
    const niceMin = Math.floor(actualMin / niceStep) * niceStep;
    const niceMax = Math.ceil(actualMax / niceStep) * niceStep;

    // Generate tick values using index-based approach to avoid floating-point accumulation errors
    let ticks: number[] = [];
    const numSteps = Math.round((niceMax - niceMin) / niceStep);

    for (let i = 0; i <= numSteps; i++) {
        // Calculate tick value directly from index to avoid accumulation errors
        const tick = niceMin + i * niceStep;

        // Only include ticks within the actual data range
        if (tick >= actualMin && tick <= actualMax) {
            ticks.push(tick);
        }
    }

    // Handle boundary inclusion based on options
    const ticksSet = new Set(ticks);
    const shouldPrioritizeBoundaries = options?.prioritizeBoundaries !== false;

    if (shouldPrioritizeBoundaries) {
        // Always include boundaries when prioritizing them
        if (ticksSet.size === 0 || !ticksSet.has(actualMin)) {
            ticks.push(actualMin);
        }
        if (!ticksSet.has(actualMax)) {
            ticks.push(actualMax);
        }
    }

    // Sort the ticks in ascending order
    ticks.sort((a, b) => a - b);

    // If we have spacing constraints, remove ticks that are too close
    if (options?.minTickSpacing && options?.availableSpace && ticks.length > 1) {
        ticks = filterTicksBySpacing(ticks, actualMin, actualMax, options);
    }

    return ticks;
}

/**
 * Filters ticks to ensure minimum spacing requirements are met.
 * Prioritizes keeping boundary values when possible.
 */
function filterTicksBySpacing(ticks: number[], min: number, max: number, options: AxisTickOptions): number[] {
    if (!options.minTickSpacing || !options.availableSpace || ticks.length <= 1) {
        return ticks;
    }

    const range = max - min;
    const pixelPerUnit = options.availableSpace / range;

    const filteredTicks: number[] = [];
    let lastTickPosition = -Infinity;

    for (const tick of ticks) {
        const currentPixelPosition = (tick - min) * pixelPerUnit;

        // Always include the first tick, or if it's far enough from the last one
        if (filteredTicks.length === 0 || currentPixelPosition - lastTickPosition >= options.minTickSpacing) {
            filteredTicks.push(tick);
            lastTickPosition = currentPixelPosition;
        }
        // Special case: always try to include the max boundary if it's the last tick
        else if (tick === max && ticks[ticks.length - 1] === tick) {
            // Check if we can fit the max by removing the last added tick
            if (filteredTicks.length > 1) {
                const secondLastPosition = (filteredTicks[filteredTicks.length - 2] - min) * pixelPerUnit;
                if (currentPixelPosition - secondLastPosition >= options.minTickSpacing) {
                    filteredTicks[filteredTicks.length - 1] = tick;
                    lastTickPosition = currentPixelPosition;
                }
            }
        }
    }

    return filteredTicks;
}
