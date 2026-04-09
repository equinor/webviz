export type ActionsProps = {
    children?: React.ReactNode;
};

export function Actions(props: ActionsProps) {
    return <div className="popup__child gap-vertical-xs flex justify-end">{props.children}</div>;
}
