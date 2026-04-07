export type BodyProps = {
    children?: React.ReactNode;
};

export function Body(props: BodyProps) {
    return <div className="popup__child">{props.children}</div>;
}
