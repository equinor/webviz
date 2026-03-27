export type ScrollAreaProps = {
    children?: React.ReactNode;
};

export function ScrollArea(props: ScrollAreaProps) {
    return (
        <div data-collapsible-scroll-area className="group relative h-full min-h-0 w-full overflow-auto pb-12">
            {props.children}
        </div>
    );
}
