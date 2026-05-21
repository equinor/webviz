import type { LayoutClassProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ContentProps = LayoutClassProps & {
    children?: React.ReactNode;
};

export function Content(props: ContentProps) {
    return (
        <div
            className={resolveClassNames(
                props.layoutClassName,
                "group-data-[state=open]/scrollareaGroup:animate-slideDown group-data-[state=closed]/scrollareaGroup:animate-slideUp px-horizontal-xs py-vertical-xs",
            )}
        >
            {props.children}
        </div>
    );
}
