import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuHeadingProps = {
    classNames?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
};

export function MenuHeading(props: MenuHeadingProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames(
                "text-xs text-gray-500 uppercase font-semibold tracking-wider px-3 py-1",
                props.classNames ?? ""
            )}
            style={props.style}
        >
            {props.children}
        </div>
    );
}
