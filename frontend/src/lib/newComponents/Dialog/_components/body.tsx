import type { LayoutClassProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type BodyProps = LayoutClassProps & {
    /** The content rendered in the scrollable body area of the dialog. */
    children?: React.ReactNode;
};

export function Body(props: BodyProps) {
    // The "dialog__popup__child" class can be found in the dialog.css file in the styles/components folder
    return (
        <div className={resolveClassNames(props.layoutClassName, "dialog__popup__child flex-1")}>{props.children}</div>
    );
}
