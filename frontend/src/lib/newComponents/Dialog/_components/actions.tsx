export type ActionsProps = {
    children?: React.ReactNode;
};

export function Actions(props: ActionsProps) {
    // The "dialog__popup__child" class can be found in the dialog.css file in the styles/components folder
    return <div className="dialog__popup__child gap-vertical-xs flex justify-end">{props.children}</div>;
}
