export const BAR_CATEGORY = "bar";

export function makeBarSeriesId(
    traceName: string,
    role: "primary" | "reference",
    axisIndex: number,
    statKey: string = ""
): string {
    return `${BAR_CATEGORY}|${role}|${traceName}|${axisIndex}|${statKey}`;
}