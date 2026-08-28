import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SideBarProps = {
    children?: React.ReactNode;
    position: "left" | "right";
    className?: string;
};

export function SideBar(props: SideBarProps) {
    return (
        <div
            className={resolveClassNames(
                "bg-surface z-sticky border-neutral-subtle sticky right-0 flex flex-col",
                props.position === "left" ? "border-r" : "border-l",
                props.className,
            )}
        >
            {props.children}
        </div>
    );
}
