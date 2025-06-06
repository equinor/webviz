import { Close } from "@mui/icons-material";

import { IconButton } from "@lib/components/IconButton";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { TagProps } from "../typesAndEnums";

export function DefaultTag(props: TagProps): React.ReactNode {
    return (
        <li
            className={resolveClassNames(
                "text-sm rounded pl-2 pr-1 py-0.5 bg-gray-100 flex gap-1 items-center relative",
                {
                    "outline-1 outline-blue-500": props.focused,
                },
            )}
            onClick={() => props.onFocus?.()}
        >
            <span>{props.tag.value}</span>
            <IconButton
                className="align-text-bottom"
                title="Remove tag"
                size="small"
                onClick={() => props.onRemove?.()}
            >
                <Close fontSize="inherit" />
            </IconButton>

            {props.selected && (
                <div className="bg-blue-500 opacity-30 absolute left-0 top-0 w-full h-full block z-10 rounded-sm" />
            )}
        </li>
    );
}
