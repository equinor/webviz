import { LayoutClassProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ContentProps = LayoutClassProps & {
    children?: React.ReactNode;
};

export function Content(props: ContentProps) {
    return (
        <div
            className={resolveClassNames(
                props.layoutClassName,
                "group-data-[state=open]:animate-slideDown group-data-[state=closed]:animate-slideUp px-horizontal-xs py-vertical-xs",
            )}
        >
            {props.children}
        </div>
    );
}
