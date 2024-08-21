import React from "react";

import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { SelectOption } from "@lib/components/Select";
import { Button, Dropdown, MenuButton } from "@mui/base";
import { Add, ArrowDropDown } from "@mui/icons-material";

export type AddItemButtonProps = {
    buttonText: string;
    options?: SelectOption[];
    onAddClicked?: () => void;
    onOptionClicked?: (value: SelectOption["value"]) => void;
};

/**
 * Generic add-button, for the top of  sortable-lists. Uses a dropdown if there's more than 1 available options
 */
export function AddItemButton(props: AddItemButtonProps): React.ReactNode {
    const options = props.options;

    function handleOptionClicked(item: SelectOption) {
        if (props.onOptionClicked) props.onOptionClicked(item.value);
    }

    if (!options) {
        return <Button>{renderAddButton(props.buttonText, false, props.onAddClicked)}</Button>;
    }

    return (
        <Dropdown>
            <MenuButton>{renderAddButton(props.buttonText, true)}</MenuButton>

            {/* Not expected to reorder, so key on index is fine */}
            <Menu className="text-sm p-1 max-h-96 overflow-auto" anchorOrigin="bottom-end">
                {options.map((entry) => (
                    <MenuItem key={entry.value} className="text-sm p-0.5" onClick={() => handleOptionClicked(entry)}>
                        {entry.label}
                    </MenuItem>
                ))}
            </Menu>
        </Dropdown>
    );
}

function renderAddButton(text: string, multiple: boolean, onClick?: () => void): React.ReactNode {
    return (
        <div className="flex items-center gap-1 py-0.5 px-1 text-sm rounded hover:bg-blue-100" onClick={onClick}>
            <Add fontSize="inherit" />
            <span>{text}</span>
            {multiple && <ArrowDropDown />}
        </div>
    );
}
