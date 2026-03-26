export type ActionsProps = {
    children?: React.ReactNode;
};

export function Actions(props: ActionsProps) {
    return <div className="popup__child">{props.children}</div>;
}
