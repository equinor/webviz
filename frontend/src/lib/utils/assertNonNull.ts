export function assertNonNull<T>(value: T | null | undefined, message?: string): T {
    if (value === null || value === undefined) {
        message = message || "Value cannot be null or undefined";
        throw new Error(message);
    }
    return value;
}
