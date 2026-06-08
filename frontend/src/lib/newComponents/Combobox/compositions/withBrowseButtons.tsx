import React from "react";

import { BrowseButtons } from "@lib/newComponents/_shared/components/browseButtons";
import { useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";

import { Combobox, type ComboboxGroup, type ComboboxItem, type ComboboxProps } from "../combobox";

function flattenItems<TValue>(items: ComboboxItem<TValue>[] | ComboboxGroup<TValue>[]): ComboboxItem<TValue>[] {
    if (items.length > 0 && "items" in Object(items[0])) {
        return (items as ComboboxGroup<TValue>[]).flatMap((g) => g.items);
    }
    return items as ComboboxItem<TValue>[];
}

export type WithBrowseButtonsProps<TValue> = Omit<
    ComboboxProps<TValue>,
    "showTriggerIcon" | "multiple" | "selectionMode" | "clearable"
>;

export const WithBrowseButtons = React.forwardRef<HTMLInputElement, WithBrowseButtonsProps<any>>(
    function WithBrowseButtons(props, ref) {
        const { value, onValueChange, defaultValue, disabled, items, ...rest } = props;
        const componentSize = useComponentSize(rest);

        const isControlled = value !== undefined;
        const [internalValue, setInternalValue] = React.useState<any>(defaultValue ?? null);
        const currentValue = isControlled ? value : internalValue;

        const enabledItems = React.useMemo(() => flattenItems(items).filter((item) => !item.disabled), [items]);

        const currentIndex = enabledItems.findIndex((item) => item.value === currentValue);

        function handleValueChange(newValue: any, eventDetails?: any) {
            if (!isControlled) setInternalValue(newValue);
            onValueChange?.(newValue, eventDetails);
        }

        function handlePrev() {
            if (enabledItems.length === 0) return;
            const nextIndex = currentIndex <= 0 ? enabledItems.length - 1 : currentIndex - 1;
            handleValueChange(enabledItems[nextIndex].value);
        }

        function handleNext() {
            if (enabledItems.length === 0) return;
            const nextIndex = currentIndex < 0 || currentIndex >= enabledItems.length - 1 ? 0 : currentIndex + 1;
            handleValueChange(enabledItems[nextIndex].value);
        }

        const buttonsDisabled = disabled || enabledItems.length === 0;

        return (
            <Combobox
                {...rest}
                ref={ref}
                items={items}
                value={currentValue}
                onValueChange={handleValueChange}
                disabled={disabled}
                endAdornment={
                    <BrowseButtons
                        size={componentSize}
                        disabled={buttonsDisabled}
                        onClickNext={handleNext}
                        onClickPrev={handlePrev}
                    />
                }
            />
        );
    },
);
