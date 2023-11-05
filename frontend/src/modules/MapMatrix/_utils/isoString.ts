export function isoStringToDateLabel(input: string): string {
    const date = input.split("T")[0];
    return `${date}`;
}

export function isoIntervalStringToDateLabel(input: string): string {
    const [start, end] = input.split("/");
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    return `${startDate}/${endDate}`;
}

export function isoStringToDateOrIntervalLabel(input: string): string {
    if (input.includes("/")) {
        return isoIntervalStringToDateLabel(input);
    } else {
        return isoStringToDateLabel(input);
    }
}
