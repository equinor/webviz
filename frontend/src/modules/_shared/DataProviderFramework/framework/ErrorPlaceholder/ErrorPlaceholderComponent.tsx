import { Warning } from "@mui/icons-material";

import { SortableListItem } from "../../components/item";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";

import type { ErrorPlaceholder } from "./ErrorPlaceholder";

export type ErrorPlaceholderComponentProps = {
    placeholder: ErrorPlaceholder;
};

export function ErrorPlaceholderComponent(props: ErrorPlaceholderComponentProps): React.ReactNode {
    return (
        <SortableListItem
            key={props.placeholder.getItemDelegate().getId()}
            id={props.placeholder.getItemDelegate().getId()}
            title={
                <div className="flex items-center gap-2 font-bold">
                    <Warning color="error" fontSize="small" />
                    {props.placeholder.getItemDelegate().getName()}
                </div>
            }
            endAdornment={<RemoveItemButton item={props.placeholder} />}
            headerClassNames="bg-red-100! text-red-800"
        >
            <div className="p-2 text-xs bg-red-50">{props.placeholder.getErrorMessage()}</div>
        </SortableListItem>
    );
}
