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
                <div className="gap-xs font-bolder flex items-center">
                    <Warning color="error" style={{ fontSize: 16 }} />
                    {props.placeholder.getItemDelegate().getName()}
                </div>
            }
            endAdornment={<RemoveItemButton item={props.placeholder} />}
            headerClassNames="bg-danger-canvas! text-red-800"
        >
            <div className="p-xs text-body-xs bg-danger">{props.placeholder.getErrorMessage()}</div>
        </SortableListItem>
    );
}
