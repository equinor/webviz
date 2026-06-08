import type React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";
import { Check } from "@mui/icons-material";

import type { ComboboxItem } from "../types";

export type ComboboxListItemProps<TValue> = {
    item: ComboboxItem<TValue>;
    itemColSpan: string;
    renderItemAdornment?: (item: TValue) => React.ReactNode;
};

export function ComboboxListItem<TValue>(props: ComboboxListItemProps<TValue>): React.ReactNode {
    return (
        <ComboboxBase.Item
            value={props.item.value}
            disabled={props.item.disabled}
            className={`user-select-none py-selectable-y pr-selectable-x gap-vertical-xs data-highlighted:text-accent-strong data-highlighted:bg-accent cursor-pointer ${props.itemColSpan} data-disabled:text-disabled box-border grid grid-cols-subgrid items-center outline-0 data-disabled:cursor-not-allowed data-highlighted:relative data-highlighted:z-0 data-highlighted:before:absolute data-highlighted:before:-z-1 data-highlighted:before:content-['']`}
        >
            <ComboboxBase.ItemIndicator className="pl-selectable-x text-accent-subtle text-body-lg col-start-1 flex items-center">
                <Check fontSize="inherit" />
            </ComboboxBase.ItemIndicator>

            {props.renderItemAdornment && (
                <div className="col-start-2 flex items-center">{props.renderItemAdornment(props.item.value)}</div>
            )}

            <div className={props.renderItemAdornment ? "col-start-3" : "col-start-2"}>{props.item.label}</div>
        </ComboboxBase.Item>
    );
}
