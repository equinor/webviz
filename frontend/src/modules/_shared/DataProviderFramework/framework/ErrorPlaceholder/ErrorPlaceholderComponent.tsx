import { SortableListItem } from "../../components/item";
import { ErrorPlaceholder } from "./ErrorPlaceholder";

export type ErrorPlaceholderComponentProps = {
    placeholder: ErrorPlaceholder;
};

export function ErrorPlaceholderComponent(props: ErrorPlaceholderComponentProps): React.ReactNode {
    return (
        <SortableListItem
            key={props.placeholder.getItemDelegate().getId()}
            id={props.placeholder.getItemDelegate().getId()}
            title={props.placeholder.getItemDelegate().getName()}
            headerClassNames="bg-red-100! text-red-800"
        >
            <div className="p-2 text-xs bg-red-50">{props.placeholder.getErrorMessage()}</div>
        </SortableListItem>
    );
}
