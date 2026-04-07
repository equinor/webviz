import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SideBarProps = {
    children?: React.ReactNode;
    position: "left" | "right";
};

export function SideBar(props: SideBarProps) {
    return (
        <div
            className={resolveClassNames(
                "bg-fill-surface z-base border-stroke-neutral-subtle flex flex-col p-2 pt-4",
                props.position === "left" ? "border-r" : "border-l",
            )}
        >
            {props.children}
        </div>
    );
}
