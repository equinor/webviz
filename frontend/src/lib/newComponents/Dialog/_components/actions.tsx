export type ActionsProps = {
    children?: React.ReactNode;
};

export function Actions(props: ActionsProps) {
    return <div className="dialog__popup__child gap-vertical-xs flex justify-end">{props.children}</div>;
}
