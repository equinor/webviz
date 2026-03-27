export type ContentProps = {
    children?: React.ReactNode;
};

export function Content(props: ContentProps) {
    return <div className="popup__child">{props.children}</div>;
}
