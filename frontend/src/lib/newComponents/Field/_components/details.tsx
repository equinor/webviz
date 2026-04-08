export type DetailsProps = {
    children?: React.ReactNode;
};

export function Details(props: DetailsProps) {
    return <div className="text-text-neutral-subtle text-body-sm">{props.children}</div>;
}
