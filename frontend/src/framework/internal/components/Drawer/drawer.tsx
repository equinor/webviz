import React from "react";

import { Dropdown, MenuButton } from "@mui/base";
import { Check, Close, MoreVert, Search } from "@mui/icons-material";

import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem/menuItem";
import { Tooltip } from "@lib/components/Tooltip";
import { Button } from "@lib/newComponents/Button";
import { TextInput } from "@lib/newComponents/TextInput";

export type DrawerFilterItem<T extends string | number> = {
    label: React.ReactNode;
    value: T;
    initiallySelected: boolean;
};

export type DrawerProps<T extends string | number> = {
    title?: string;
    icon?: React.ReactElement;
    visible: boolean;
    showSearch?: boolean;
    filterItems?: DrawerFilterItem<T>[];
    onFilterItemSelectionChange?: (selectedItems: T[]) => void;
    searchInputPlaceholder?: string;
    onSearchQueryChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClose?: () => void;
    actions?: React.ReactNode;
    headerChildren?: React.ReactNode;
    children: React.ReactNode;
};

export function Drawer<T extends string | number>(props: DrawerProps<T>) {
    const { onFilterItemSelectionChange } = props;
    const [selectedFilterItems, setSelectedFilterItems] = React.useState<T[]>(
        props.filterItems?.filter((item) => item.initiallySelected).map((item) => item.value) ?? [],
    );
    const [open, setOpen] = React.useState(false);

    const handleOpenChange = (event: React.SyntheticEvent | null, nextOpen: boolean) => {
        // If the menu is trying to close because a menuitem was clicked, ignore it.
        const cameFromMenuItemClick =
            (event as any)?.type === "click" && (event?.target as Element | null)?.closest?.('[role="menuitem"]');

        if (!nextOpen && cameFromMenuItemClick) return; // ignore close
        setOpen(nextOpen); // allow other close reasons (outside click, Escape, etc.)
    };

    const handleFilterItemClick = React.useCallback(
        function handleFilterItemClick(e: React.MouseEvent<HTMLElement, MouseEvent>, item: DrawerFilterItem<T>) {
            setSelectedFilterItems((prevSelectedItems) => {
                let newSelectedItems: T[];
                if (prevSelectedItems.includes(item.value)) {
                    newSelectedItems = prevSelectedItems.filter((value) => value !== item.value);
                } else {
                    newSelectedItems = [...prevSelectedItems, item.value];
                }

                onFilterItemSelectionChange?.(newSelectedItems);
                return newSelectedItems;
            });

            e.preventDefault();
            e.stopPropagation();
        },
        [onFilterItemSelectionChange],
    );

    const showFilter = props.filterItems && props.filterItems.length > 0;
    const showHeader = props.icon || props.title || props.onClose || props.actions;

    return (
        <div className={`bg-surface flex h-full min-h-0 flex-col ${props.visible ? "" : "hidden"}`}>
            {showHeader && (
                <div className="bg-surface p-vertical-xs border-neutral-subtle flex items-center justify-center border-b">
                    {props.icon && React.cloneElement(props.icon, { fontSize: "small", className: "mr-2" })}
                    <span className="grow p-0 text-sm font-bold">{props.title}</span>
                    {props.actions}
                    {props.onClose && (
                        <Tooltip title="Close">
                            <Button variant="text" tone="neutral" iconOnly onClick={props.onClose} size="small">
                                <Close fontSize="inherit" />
                            </Button>
                        </Tooltip>
                    )}
                </div>
            )}
            <div className="flex h-auto grow flex-col">
                {(props.showSearch || showFilter) && (
                    <div className="bg-neutral flex gap-2 p-2">
                        {props.showSearch && (
                            <div className="grow">
                                <TextInput
                                    placeholder={props.searchInputPlaceholder}
                                    startAdornment={<Search fontSize="small" />}
                                    onChange={props.onSearchQueryChange}
                                />
                            </div>
                        )}
                        {showFilter && (
                            <Dropdown open={open} onOpenChange={handleOpenChange}>
                                <MenuButton className="rounded-sm p-1 hover:bg-blue-200 focus:outline-blue-600">
                                    <MoreVert fontSize="small" />
                                </MenuButton>
                                <Menu anchorOrigin="bottom-end">
                                    {props.filterItems?.map((item) => (
                                        <MenuItem
                                            key={item.value}
                                            onClick={(e) => handleFilterItemClick(e, item)}
                                            className="text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="w-6">
                                                    {selectedFilterItems.includes(item.value) && (
                                                        <Check fontSize="small" />
                                                    )}
                                                </span>
                                                {item.label}
                                            </div>
                                        </MenuItem>
                                    ))}
                                </Menu>
                            </Dropdown>
                        )}
                    </div>
                )}
                {props.headerChildren && <div className="bg-slate-50 p-2">{props.headerChildren}</div>}
                <div className="h-0 max-h-full min-h-0 grow overflow-y-auto">{props.children}</div>
            </div>
        </div>
    );
}
