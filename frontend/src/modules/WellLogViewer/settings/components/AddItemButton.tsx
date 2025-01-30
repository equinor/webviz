import React from "react";

import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { SelectOption } from "@lib/components/Select";
import { Button, Dropdown, MenuButton } from "@mui/base";
import {
    Add,
    /*, ArrowDropDown */
} from "@mui/icons-material";

export type AddItemButtonProps<TValue> = {
    buttonText: string;
    options?: SelectOption<TValue>[];
    onAddClicked?: () => void;
    onOptionClicked?: (value: TValue) => void;
};

/**
 * Generic add-button, for the top of  sortable-lists. Uses a dropdown if there's more than 1 available options
 */
export function AddItemButton<TValue>(props: AddItemButtonProps<TValue>): React.ReactNode {
    const { onOptionClicked, onAddClicked } = props;

    const handleOptionClicked = React.useCallback(
        function handleOptionClicked(item: SelectOption<TValue>) {
            if (onOptionClicked) onOptionClicked(item.value);
        },
        [onOptionClicked]
    );

    if (!props.options) {
        return (
            <Button onClick={onAddClicked}>
                <ButtonContent text={props.buttonText} />
            </Button>
        );
    }

    return (
        <Dropdown>
            <MenuButton>
                <ButtonContent text={props.buttonText} multiple />
            </MenuButton>

            <Menu className="text-sm p-1 max-h-96 overflow-auto" anchorOrigin="bottom">
                {props.options.map((entry) => (
                    <MenuItem
                        key={String(entry.value)}
                        className="text-sm p-0.5"
                        onClick={() => handleOptionClicked(entry)}
                    >
                        {entry.adornment} {entry.label}
                    </MenuItem>
                ))}
            </Menu>
        </Dropdown>
    );
}

function ButtonContent(props: { text: string; multiple?: boolean }) {
    return (
        <div className="flex items-center gap-1 py-0.5 pl-1 pr-2 text-sm rounded hover:bg-blue-100">
            <Add fontSize="inherit" />
            <span>{props.text}</span>
        </div>
    );
}
