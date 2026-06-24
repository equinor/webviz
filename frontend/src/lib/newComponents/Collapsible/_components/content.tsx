import type { LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ContentProps = LayoutClassProps & {
    /** The content rendered inside the collapsible panel. */
    children?: React.ReactNode;
};

export function Content(props: ContentProps) {
    return (
        <div
            style={props.layoutStyle}
            className={resolveClassNames(
                props.layoutClassName,
                "group-data-[state=open]/scrollareaGroup:animate-slideDown group-data-[state=closed]/scrollareaGroup:animate-slideUp px-xs py-xs",
            )}
        >
            {props.children}
        </div>
    );
}
