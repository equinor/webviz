import React from "react";

import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

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
        const { value, onValueChange, defaultValue, disabled, items, size, ...rest } = props;

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
                size={size}
                endAdornment={
                    <div
                        className={resolveClassNames("flex h-full flex-col items-center", {
                            "flex-row": size === "small",
                        })}
                    >
                        <ArrowButton onClick={handlePrev} disabled={buttonsDisabled} title="Previous option">
                            <KeyboardArrowUp fontSize="inherit" />
                        </ArrowButton>
                        <ArrowButton onClick={handleNext} disabled={buttonsDisabled} title="Next option">
                            <KeyboardArrowDown fontSize="inherit" />
                        </ArrowButton>
                    </div>
                }
            />
        );
    },
);

type ArrowButtonProps = {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
};

function ArrowButton(props: ArrowButtonProps) {
    return (
        <button
            className={resolveClassNames(
                "focusable text-body-xs bg-neutral hover:bg-neutral-hover active:bg-neutral-active px-horizontal-4xs flex flex-1 items-center justify-center group-disabled:pointer-events-none focus:outline-0",
                {
                    "pointer-events-none": props.disabled,
                },
            )}
            disabled={props.disabled}
            onClick={props.onClick}
            aria-label={props.title}
            title={props.title}
        >
            {props.children}
        </button>
    );
}
