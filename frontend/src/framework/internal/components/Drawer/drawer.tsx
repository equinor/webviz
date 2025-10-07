import React from "react";

import { Dropdown, MenuButton } from "@mui/base";
import { Check, Close, FilterAlt, Search } from "@mui/icons-material";

import { Badge } from "@lib/components/Badge";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Input } from "@lib/components/Input";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem/menuItem";
import { Tooltip } from "@lib/components/Tooltip";

export type DrawerFilterItem<T extends string | number> = {
    label: React.ReactNode;
    value: T;
    initiallySelected: boolean;
};

export type DrawerProps<T extends string | number> = {
    title: string;
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

    return (
        <div className={`flex flex-col bg-white min-h-0 h-full${props.visible ? "" : " hidden"}`}>
            <div className="flex justify-center items-center p-2 bg-slate-100 h-10 shadow-sm">
                {props.icon && React.cloneElement(props.icon, { fontSize: "small", className: "mr-2" })}
                <span className="font-bold grow p-0 text-sm">{props.title}</span>
                {props.actions}
                {props.onClose && (
                    <Tooltip title="Close">
                        <DenseIconButton onClick={props.onClose}>
                            <Close fontSize="inherit" />
                        </DenseIconButton>
                    </Tooltip>
                )}
            </div>
            <div className="grow flex flex-col h-auto">
                {(props.showSearch || showFilter) && (
                    <div className="flex gap-2 bg-slate-50 p-2">
                        {props.showSearch && (
                            <div className="grow">
                                <Input
                                    placeholder={props.searchInputPlaceholder}
                                    startAdornment={<Search fontSize="small" />}
                                    onChange={props.onSearchQueryChange}
                                />
                            </div>
                        )}
                        {showFilter && (
                            <Dropdown open={open} onOpenChange={handleOpenChange}>
                                <MenuButton className="p-1 rounded-sm hover:bg-blue-200 focus:outline-blue-600">
                                    <Badge
                                        badgeContent={selectedFilterItems.length}
                                        color="bg-blue-500"
                                        invisible={selectedFilterItems.length === 0}
                                    >
                                        <FilterAlt fontSize="small" />
                                    </Badge>
                                </MenuButton>
                                <Menu anchorOrigin="bottom-end">
                                    {props.filterItems?.map((item) => (
                                        <MenuItem
                                            key={item.value}
                                            onClick={(e) => handleFilterItemClick(e, item)}
                                            className="text-sm"
                                        >
                                            <div className="flex gap-2 items-center">
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
                {props.headerChildren && <div className="p-2 bg-slate-50">{props.headerChildren}</div>}
                <div className="grow min-h-0 overflow-y-auto max-h-full h-0">{props.children}</div>
            </div>
        </div>
    );
}
