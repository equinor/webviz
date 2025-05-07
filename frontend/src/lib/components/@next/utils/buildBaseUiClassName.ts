/**
 * Combines one or more BaseUi className props into a single class name string
 * @param state Base UI component state. Depends on
 * @param classNames
 * @returns
 */
export function buildBaseUiClassName<TState>(
    state: TState,
    ...classNames: (undefined | string | ((state: TState) => string))[]
): string {
    return classNames
        .reduce((acc: string, className) => {
            let classNameString;

            if (typeof className === "function") classNameString = className(state);
            else classNameString = className;

            if (!classNameString) return acc;
            return `${acc} ${classNameString}`;
        }, "")
        .trim();
}
