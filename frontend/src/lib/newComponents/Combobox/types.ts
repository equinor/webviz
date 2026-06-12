import type React from "react";

export type ComboboxGroup<TValue> = {
    value: string;
    items: ComboboxItem<TValue>[];
    disabled?: boolean;
};

export type ComboboxItem<TValue> = {
    value: TValue;
    label: string;
    disabled?: boolean;
};

export type AsyncState = {
    loading?: boolean;
    loadingText?: React.ReactNode;
    errorText?: React.ReactNode;
};
export type ComboboxItems<TValue> = ComboboxItem<TValue>[] | ComboboxGroup<TValue>[];
