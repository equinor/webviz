import type { LayoutClassProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type BodyProps = LayoutClassProps & {
    children?: React.ReactNode;
};

export function Body(props: BodyProps) {
    // The "dialog__popup__child" class can be found in the dialog.css file in the styles/components folder
    return <div className={resolveClassNames(props.layoutClassName, "dialog__popup__child")}>{props.children}</div>;
}
