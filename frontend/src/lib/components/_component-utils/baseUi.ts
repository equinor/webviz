import type { BaseUIComponentProps } from "@base-ui/react/utils/types";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export function makeClassNameProp<State>(
    baseClassName: string,
    className: BaseUIComponentProps<any, State>["className"],
): BaseUIComponentProps<any, State>["className"] {
    if (typeof className === "function") {
        return (state) => resolveClassNames(baseClassName, className(state));
    }

    return resolveClassNames(baseClassName, className);
}
