import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";
import type { ComboboxRootProps } from "@base-ui/react";
import { Clear, Error, UnfoldMore } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import { withDefaults } from "../_shared/utils/defaultProps";
import type { SelectableSize } from "../_shared/utils/size";
import { SELECTABLE_SIZES_CLASSNAMES } from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";
import { Button } from "../Button";
import { CircularProgress } from "../CircularProgress";

import { ComboboxListGroup } from "./_components/group";
import { ComboboxSingleValueInput } from "./_components/inputVariants/singleValueInput";
import { ComboboxValueChipsInput } from "./_components/inputVariants/valueChipsInput";
import { ComboboxValueCountInput } from "./_components/inputVariants/valueCountInput";
import { ComboboxListItem } from "./_components/item";
import { ComboBoxPopup } from "./_components/popup";
import type { AsyncState, ComboboxGroup, ComboboxItem, ComboboxItems } from "./types";

function isGroupedItems<TValue>(items: ComboboxItems<TValue> | undefined): items is ComboboxGroup<TValue>[] {
    return Array.isArray(items) && items.length > 0 && "items" in Object(items[0]);
}

export type ComboboxProps<TValue, TMultiple extends boolean | undefined = false> = ComponentWrapperProps<
    Omit<
        ComboboxRootProps<TValue, TMultiple>,
        "items" | "itemToStringLabel" | "itemToStringValue" | "isItemEqualToValue"
    >
> &
    AsyncState & {
        /** The list of items or grouped items to display in the dropdown. */
        items: ComboboxItems<TValue>;
        /** Content shown when no items match the current search input. @default "No matches found" */
        noMatchesText?: React.ReactNode;
        /** When true, shows a button to clear the entire selection. @default false */
        showClearAllButton?: boolean;
        /** startAdornment is shown at the start of the component */
        startAdornment?: React.ReactNode;
        /** endAdornment is shown instead of the trigger icon at the end of the input - only when `multiple` is false */
        endAdornment?: React.ReactNode;
        /** Optional function to render an adornment alongside each item in the dropdown list. */
        renderItemAdornment?: (item: TValue) => React.ReactNode;
        /** Size of the combobox input. @default "default" */
        size?: SelectableSize;
        /** Only applies when `multiple` is true. "chips" (default) renders a chip per selection; "count" renders "X/N selected". */
        selectionMode?: "chips" | "count";
        /** Placeholder text shown when no value is selected. Not applicable in count selection mode. @default "Select an option" */
        placeholder?: string;
    };

function getItemValueKey<TValue>(item: TValue): React.Key {
    return (item as any).value ?? String(item);
}

const DEFAULT_PROPS = {
    placeholder: "Select an option",
    noMatchesText: "No matches found",
    loadingText: (
        <span className="gap-x-sm flex items-center">
            <CircularProgress size={16} />
            Loading options
        </span>
    ),
    showClearAllButton: false,
    selectionMode: "chips",
} satisfies Partial<ComboboxProps<any, any>>;

function ComboboxComponent<TValue, TMultiple extends boolean | undefined = false>(
    props: ComboboxProps<TValue, TMultiple>,
    ref: React.ForwardedRef<HTMLInputElement>,
) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const { renderItemAdornment, ...rest } = defaultedProps;

    const baseProps = resolveWrapperProps(
        rest,
        "placeholder",
        "noMatchesText",
        "loadingText",
        "showClearAllButton",
        "selectionMode",
        "items",
        "loading",
        "errorText",
        "size",
    );

    const hasGroups = isGroupedItems(defaultedProps.items);
    const size = useComponentSize(props);

    const flatItems = React.useMemo(() => {
        if (isGroupedItems(defaultedProps.items)) {
            return defaultedProps.items.flatMap<ComboboxItem<TValue>>((g) => g.items);
        }
        return defaultedProps.items;
    }, [defaultedProps.items]);

    const baseItems = React.useMemo(() => {
        if (isGroupedItems(defaultedProps.items)) {
            return defaultedProps.items.map((group) => ({
                ...group,
                items: group.items.map((item) => item.value),
            }));
        }

        return defaultedProps.items.map((item) => item.value);
    }, [defaultedProps.items]);

    const itemByValue = React.useMemo(() => {
        return new Map(flatItems.map((item) => [item.value, item]));
    }, [flatItems]);

    function getLabelForValue(value: TValue): string {
        return itemByValue.get(value)?.label ?? String(value);
    }

    function renderValueItem(value: TValue) {
        const item = itemByValue.get(value as TValue);
        if (!item) return null;

        return (
            <ComboboxListItem
                key={getItemValueKey(item)}
                item={item}
                isMultiSelect={defaultedProps.multiple}
                renderItemAdornment={renderItemAdornment}
            />
        );
    }

    return (
        <ComboboxBase.Root
            {...baseProps}
            items={baseItems}
            itemToStringLabel={(value) => getLabelForValue(value as unknown as TValue)}
        >
            <ComboboxBase.InputGroup
                render={(htmlProps, state) => {
                    const { children, ...divProps } = htmlProps;
                    return (
                        <div
                            {...divProps}
                            className={resolveClassNames(
                                defaultedProps.layoutClassName,
                                "form-element gap-x-sm px-sm flex cursor-text items-center",
                                size !== "small" ||
                                    (defaultedProps.multiple && defaultedProps.selectionMode === "chips")
                                    ? "py-2xs"
                                    : undefined,
                                SELECTABLE_SIZES_CLASSNAMES[size],
                            )}
                        >
                            {(state.valid === false || defaultedProps.startAdornment) && (
                                <div className="flex shrink-0 items-center">
                                    {state.valid === false ? (
                                        <Error fontSize="inherit" className="fill-text-danger-subtle!" />
                                    ) : (
                                        defaultedProps.startAdornment
                                    )}
                                </div>
                            )}
                            {children}
                        </div>
                    );
                }}
            >
                {/* --- Input variants --- */}
                {defaultedProps.multiple && defaultedProps.selectionMode === "chips" && (
                    <ComboboxValueChipsInput
                        ref={ref}
                        getLabelForValue={getLabelForValue}
                        renderItemAdornment={renderItemAdornment}
                        placeholder={defaultedProps.placeholder}
                    />
                )}
                {defaultedProps.multiple && defaultedProps.selectionMode === "count" && (
                    <ComboboxValueCountInput ref={ref} flatItems={flatItems} />
                )}
                {!defaultedProps.multiple && (
                    <ComboboxSingleValueInput
                        ref={ref}
                        renderItemAdornment={renderItemAdornment}
                        placeholder={defaultedProps.placeholder}
                    />
                )}

                {/* --- Controls --- */}
                <div className="gap-selectable -mr-3xs box-border flex h-full shrink-0 items-center justify-center empty:hidden">
                    {defaultedProps.showClearAllButton && (
                        <ComboboxBase.Clear
                            aria-label="Clear selection"
                            render={<Button tone="neutral" iconOnly variant="ghost" size="small" />}
                        >
                            <Clear fontSize="inherit" />
                        </ComboboxBase.Clear>
                    )}
                    {(!defaultedProps.multiple || defaultedProps.selectionMode === "count") &&
                        !defaultedProps.endAdornment && (
                            <ComboboxBase.Trigger
                                className="box-border flex items-center justify-center"
                                aria-label="Open options"
                            >
                                <UnfoldMore fontSize="inherit" />
                            </ComboboxBase.Trigger>
                        )}
                    {defaultedProps.endAdornment && (
                        <div className="flex items-center">{defaultedProps.endAdornment}</div>
                    )}
                </div>
            </ComboboxBase.InputGroup>

            <ComboBoxPopup itemSize={size}>
                <ComboboxBase.Status className="sr-only">
                    {defaultedProps.loading ? defaultedProps.loadingText : defaultedProps.errorText}
                </ComboboxBase.Status>

                {defaultedProps.errorText ? (
                    <div className="p-selectable italic">{defaultedProps.errorText}</div>
                ) : (
                    <React.Fragment>
                        <ComboboxBase.Empty>
                            <div className="p-selectable italic">
                                {defaultedProps.loading ? defaultedProps.loadingText : defaultedProps.noMatchesText}
                            </div>
                        </ComboboxBase.Empty>

                        <ComboboxBase.List>
                            {hasGroups
                                ? (group) => (
                                      <React.Fragment key={group.value}>
                                          <ComboboxBase.Separator className="menu__separator" />
                                          <ComboboxListGroup group={group}>{renderValueItem}</ComboboxListGroup>
                                      </React.Fragment>
                                  )
                                : renderValueItem}
                        </ComboboxBase.List>
                    </React.Fragment>
                )}
            </ComboBoxPopup>
        </ComboboxBase.Root>
    );
}

export const Combobox = React.forwardRef(ComboboxComponent as any) as <
    TValue,
    TMultiple extends boolean | undefined = false,
>(
    props: ComboboxProps<TValue, TMultiple> & {
        ref?: React.Ref<HTMLInputElement>;
    },
) => React.ReactElement;
