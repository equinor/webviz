export function createScaledNumberWithSuffix(value: number): { scaledValue: number; suffix: string } {
    let suffix = "";
    let scaledValue = value;
    const log = Math.log10(Math.abs(value));
    if (log >= 9) {
        scaledValue = value / 1e9;
        suffix = "G";
    } else if (log >= 6) {
        scaledValue = value / 1e6;
        suffix = "M";
    } else if (log >= 3) {
        scaledValue = value / 1e3;
        suffix = "k";
    }
    return { scaledValue, suffix };
}
