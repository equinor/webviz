import type React from "react";

export type ComboboxGroup<TValue> = {
    /** Unique identifier for the group. */
    value: string;
    /** The items belonging to this group. */
    items: ComboboxItem<TValue>[];
    /** When true, disables all items in the group. */
    disabled?: boolean;
};

export type ComboboxItem<TValue> = {
    /** The underlying data value for this item. */
    value: TValue;
    /** The display text shown in the list. */
    label: string;
    /** When true, prevents the item from being selected. */
    disabled?: boolean;
};

export type AsyncState = {
    /** When true, shows a loading state inside the dropdown. */
    loading?: boolean;
    /** Custom content shown in the dropdown while loading. @default spinning indicator + "Loading options" */
    loadingText?: React.ReactNode;
    /** Error message shown in the dropdown when loading fails. */
    errorText?: React.ReactNode;
};
export type ComboboxItems<TValue> = ComboboxItem<TValue>[] | ComboboxGroup<TValue>[];
