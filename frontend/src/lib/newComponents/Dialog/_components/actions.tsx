import React from "react";

export type ActionsProps = {
    /** The action buttons to render. The last child automatically receives `autoFocus`. */
    children?: React.ReactNode;
};

export function Actions(props: ActionsProps) {
    const children = React.Children.toArray(props.children);
    const last = children.length - 1;

    const withFocus = children.map((child, i) =>
        i === last && React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ autoFocus?: boolean }>, { autoFocus: true })
            : child,
    );

    // The "dialog__popup__child" class can be found in the dialog.css file in the styles/components folder
    return <div className="dialog__popup__child gap-xs flex justify-end">{withFocus}</div>;
}
