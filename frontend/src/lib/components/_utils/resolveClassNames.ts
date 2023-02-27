export function resolveClassNames(...classNamesOrLists: (Record<string, boolean | undefined> | string)[]): string {
    const classNames = classNamesOrLists.reduce((acc, curr) => {
        if (typeof curr === "string") {
            acc.push(curr);
        } else {
            acc.push(
                ...Object.entries(curr)
                    .filter(([, value]) => value)
                    .map(([key]) => key)
            );
        }
        return acc;
    }, [] as string[]);

    return classNames.join(" ");
}
