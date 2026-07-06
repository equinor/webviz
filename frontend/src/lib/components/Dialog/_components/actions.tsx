import React from "react";

export type ActionsProps = {
    /** Whether the last action button should automatically receive focus. @default false */
    withAutoFocus?: boolean;

    /** The action buttons to render. The last child automatically receives `autoFocus` if `withAutoFocus` is true. */
    children?: React.ReactNode;
};

export const Actions = React.forwardRef<HTMLDivElement, ActionsProps>(function Actions(props, ref) {
    const children = React.Children.toArray(props.children);
    const last = children.length - 1;

    const withFocus = children.map((child, i) => {
        if (i === last && props.withAutoFocus && React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{ autoFocus?: boolean }>, { autoFocus: true });
        }
        return child;
    });

    // The "dialog__popup__child" class can be found in the dialog.css file in the styles/components folder
    return (
        <div ref={ref} className="dialog__popup__child gap-xs flex justify-end">
            {withFocus}
        </div>
    );
});
