import type { BaseUIComponentProps } from "@base-ui/react/internals/types";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

/**
 * Utility to resolve classnames for a BaseUI component that might receive a state-function as it's prop
 * @param baseClassName
 * @param className
 * @returns
 */
export function makeClassNameProp<State>(
    baseClassName: string,
    className: BaseUIComponentProps<any, State>["className"],
): BaseUIComponentProps<any, State>["className"] {
    if (typeof className === "function") {
        return (state) => resolveClassNames(baseClassName, className(state));
    }

    return resolveClassNames(baseClassName, className);
}
