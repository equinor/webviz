import type React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";
import { Check } from "@mui/icons-material";

import { SharedCheckboxItem } from "@lib/newComponents/_shared/components/menus/checkboxItem";
import { SharedMenuItem } from "@lib/newComponents/_shared/components/menus/menuItem";

import type { ComboboxItem } from "../types";

export type ComboboxListItemProps<TValue> = {
    item: ComboboxItem<TValue>;
    isMultiSelect?: boolean;
    renderItemAdornment?: (item: TValue) => React.ReactNode;
};

export function ComboboxListItem<TValue>(props: ComboboxListItemProps<TValue>): React.ReactNode {
    function makeAdornment() {
        if (!props.renderItemAdornment) return null;

        return <div className="flex items-center">{props.renderItemAdornment(props.item.value)}</div>;
    }

    if (props.isMultiSelect) {
        return (
            <SharedCheckboxItem value={props.item.value} disabled={props.item.disabled} icon={makeAdornment()}>
                {props.item.label}
            </SharedCheckboxItem>
        );
    } else {
        return (
            <SharedMenuItem
                value={props.item.value}
                disabled={props.item.disabled}
                icon={
                    <>
                        <ComboboxBase.ItemIndicator
                            className="menu__toggle_indicator"
                            keepMounted
                            render={(p, s) => (
                                <span {...p}>
                                    <Check
                                        data-selected={s.selected ? "" : undefined}
                                        className="invisible data-selected:visible"
                                    />
                                </span>
                            )}
                        />
                        {makeAdornment()}
                    </>
                }
            >
                {props.item.label}
            </SharedMenuItem>
        );
    }
}
