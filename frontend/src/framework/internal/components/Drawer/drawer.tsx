import React from "react";

import { Close, FilterList, MoreVert, Search } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";
import { Button } from "@lib/newComponents/Button";
import { MenuCompositions } from "@lib/newComponents/Menu/compositions";
import { TextInput } from "@lib/newComponents/TextInput";

export type DrawerFilterItem<T extends string | number> = {
    icon: React.ReactNode;
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

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen); // allow other close reasons (outside click, Escape, etc.)
    };

    const handleFilterItemClick = React.useCallback(
        function handleFilterItemClick(itemValue: string) {
            setSelectedFilterItems((prevSelectedItems) => {
                let newSelectedItems: T[];

                // ! The incoming value will always be a string, but the external values **might** be numerical, so we cast them here
                if (prevSelectedItems.some((i) => itemValue === String(i))) {
                    newSelectedItems = prevSelectedItems.filter((value) => String(value) !== itemValue);
                } else {
                    const item = props.filterItems?.find((i) => String(i.value) === itemValue);
                    newSelectedItems = [...prevSelectedItems, item!.value];
                }

                onFilterItemSelectionChange?.(newSelectedItems);
                return newSelectedItems;
            });
        },
        [onFilterItemSelectionChange, props.filterItems],
    );

    const showFilter = props.filterItems && props.filterItems.length > 0;
    const showHeader = props.icon || props.title || props.onClose || props.actions;

    return (
        <div className={`bg-surface flex h-full min-h-0 flex-col ${props.visible ? "" : "hidden"}`}>
            {showHeader && (
                <div className="bg-canvas py-3xs px-2xs border-neutral-subtle gap-x-xs flex items-center justify-center border-b">
                    {props.icon && React.cloneElement(props.icon, { fontSize: "small" })}
                    <span className="text-header-xs font-bolder grow p-0">{props.title}</span>
                    {props.actions}
                    {props.onClose && (
                        <Tooltip title="Close">
                            <Button variant="ghost" tone="neutral" iconOnly onClick={props.onClose} size="small">
                                <Close fontSize="inherit" />
                            </Button>
                        </Tooltip>
                    )}
                </div>
            )}
            <div className="flex h-auto grow flex-col">
                {(props.showSearch || showFilter) && (
                    <div className="bg-surface py-3xs gap-xs flex">
                        {props.showSearch && (
                            <div className="grow">
                                <TextInput
                                    placeholder={props.searchInputPlaceholder}
                                    startAdornment={<Search fontSize="small" />}
                                    onChange={props.onSearchQueryChange}
                                />
                            </div>
                        )}
                        {showFilter && props.filterItems?.length && (
                            <MenuCompositions.Default
                                open={open}
                                onOpenChange={handleOpenChange}
                                closeOnClick={false}
                                onActionClicked={(id) => handleFilterItemClick(id)}
                                items={props.filterItems.map((item) => ({
                                    id: String(item.value),
                                    checked: selectedFilterItems.includes(item.value),
                                    label: item.label,
                                    icon: item.icon,
                                }))}
                            >
                                <Button variant="ghost" iconOnly size="small">
                                    <FilterList fontSize="small" />
                                </Button>
                            </MenuCompositions.Default>
                        )}
                    </div>
                )}
                {props.headerChildren && <div className="bg-canvas p-xs">{props.headerChildren}</div>}
                <div className="h-0 max-h-full min-h-0 grow overflow-y-auto">{props.children}</div>
            </div>
        </div>
    );
}
