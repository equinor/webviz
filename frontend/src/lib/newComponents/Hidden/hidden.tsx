import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type HiddenProps = {
    children: React.ReactNode;
    hidden?: boolean;
    keepMounted?: boolean;
};

export function Hidden(props: HiddenProps) {
    if (props.keepMounted) {
        return <div className={resolveClassNames("contents", { hidden: props.hidden })}>{props.children}</div>;
    }

    return <>{props.hidden ? null : props.children}</>;
}
