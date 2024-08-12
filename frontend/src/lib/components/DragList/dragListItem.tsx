import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vec2 } from "@lib/utils/vec2";
import { DragIndicator } from "@mui/icons-material";

export type DragListItemProps = {
    id: string;
    isDragging?: boolean;
    dragPosition?: Vec2;
    icon?: React.ReactNode;
    title: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    children: React.ReactNode;
};

export function DragListItem(props: DragListItemProps): React.ReactNode {
    const divRef = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(divRef);

    return (
        <div
            className={resolveClassNames(
                "drag-list-element drag-list-item flex flex-col gap-2 p-2 bg-white rounded shadow-md relative"
            )}
            data-item-id={props.id}
            ref={divRef}
        >
            <div
                className={resolveClassNames("z-30 w-full h-full absolute left-0 top-0 bg-blue-500", {
                    hidden: !props.isDragging,
                })}
            ></div>
            <ItemHeader {...props} />
            {props.isDragging &&
                props.dragPosition &&
                createPortal(
                    <div
                        className={resolveClassNames(
                            "flex h-10 px-1 bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50"
                        )}
                        style={{
                            left: props.dragPosition.x,
                            top: props.dragPosition.y,
                            width: props.isDragging ? boundingClientRect.width : undefined,
                        }}
                    >
                        <ItemHeader {...props} />
                    </div>
                )}
            <div className="flex flex-col gap-2">{props.children}</div>
        </div>
    );
}

type ItemHeaderProps = {
    icon?: React.ReactNode;
    title: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
};

function ItemHeader(props: ItemHeaderProps): React.ReactNode {
    return (
        <div className="flex gap-1 h-8">
            <div className={resolveClassNames("drag-list-element-indicator px-0.5 hover:cursor-grab")}>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </div>
            <div className="flex items-center gap-2">
                {props.icon}
                <div className="flex-grow">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
