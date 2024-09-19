export type MenuHeadingProps = {
    children: React.ReactNode;
};

export function MenuHeading(props: MenuHeadingProps): React.ReactNode {
    return (
        <div className="text-xs text-gray-500 uppercase font-semibold tracking-wider px-3 py-1">{props.children}</div>
    );
}
