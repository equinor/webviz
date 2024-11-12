/**
 * Create a step size for a continuous value slider based on the min and max values.
 *
 * The step size is computed as a fraction of the range, and then rounded to a magnitude-adjusted value.
 */
export function createContinuousValueSliderStep(min: number, max: number): number {
    const range = Math.abs(max - min);

    // Determine the number of steps based on the magnitude of the range
    const magnitude = Math.floor(Math.log10(range));

    let numberOfSteps = 100;
    let digitPrecision = 3;
    if (magnitude < 1) {
        numberOfSteps = 100;
        digitPrecision = 4;
    } else if (magnitude < 2) {
        numberOfSteps = 100;
    } else if (magnitude < 3) {
        numberOfSteps = 1000;
    } else {
        numberOfSteps = 10000;
    }

    // Calculate the step size based on the number of steps
    let stepSize = range / numberOfSteps;

    // Reduce number of significant digits
    stepSize = parseFloat(stepSize.toPrecision(digitPrecision));

    return stepSize;
}
