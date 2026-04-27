import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";
import type { ComboboxRootProps } from "@base-ui/react";
import { Check, Clear, UnfoldMore } from "@mui/icons-material";
import { Typography } from "../Typography";
import { Button } from "../Button";

export type ComboboxGroup<TItem> = {
    value: string;
    items: TItem[];
};

type ComboboxItems<TItem> = TItem[] | ComboboxGroup<TItem>[];

function isGroupedItems<TItem>(items: ComboboxItems<TItem> | undefined): items is ComboboxGroup<TItem>[] {
    return Array.isArray(items) && items.length > 0 && "items" in Object(items[0]);
}

export type AsyncState = {
    loading?: boolean;
    loadingText?: React.ReactNode;
    errorText?: React.ReactNode;
};

export type ComboboxProps<TValue, TMultiple extends boolean | undefined = false> = Omit<
    ComboboxRootProps<TValue, TMultiple>,
    "items"
> &
    AsyncState & {
        items: ComboboxItems<TValue>;
        placeholder?: string;
        noMatchesText?: React.ReactNode;
        clearable?: boolean;
    };

const DEFAULT_PROPS = {
    placeholder: "Select an option",
    noMatchesText: "No matches found",
    loadingText: "Loading options",
    errorText: undefined,
    clearable: false,
} satisfies Partial<ComboboxProps<any>>;

function getItemLabel<TValue>(item: TValue, itemToStringLabel?: (item: TValue) => string): string {
    return itemToStringLabel?.(item) ?? (item as any).label ?? (item as any).value ?? String(item);
}

function getItemKey<TValue>(item: TValue, itemToStringValue?: (item: TValue) => string): React.Key {
    return itemToStringValue?.(item) ?? (item as any).value ?? String(item);
}

function ComboboxComponent<TValue, TMultiple extends boolean | undefined = false>(
    props: ComboboxProps<TValue, TMultiple>,
    ref: React.ForwardedRef<HTMLInputElement>,
) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    const { placeholder, loading, loadingText, errorText, clearable, noMatchesText, items, ...rootProps } =
        defaultedProps;

    const hasGroups = isGroupedItems(items);

    return (
        <ComboboxBase.Root items={items as any} {...rootProps}>
            <ComboboxBase.InputGroup className="pl-selectable-x form-element outline-neutral bg-canvas text-body-sm gap-horizontal-sm py-vertical-2xs flex w-64 cursor-text items-center outline -outline-offset-2">
                <div className="gap-horizontal-sm flex grow flex-wrap items-center">
                    <ComboboxBase.Value>
                        {(value) => (
                            <React.Fragment>
                                {Array.isArray(value) && value.length > 0 && (
                                    <ComboboxBase.Chips className="gap-horizontal-xs flex flex-wrap items-center">
                                        {value.map((item) => {
                                            const label = getItemLabel(item, rootProps.itemToStringLabel as any);
                                            const key = getItemKey(item, rootProps.itemToStringValue as any);
                                            return (
                                                <ComboboxBase.Chip
                                                    key={key}
                                                    aria-label={label}
                                                    className="gap-horizontal-xs bg-neutral text-neutral-strong flex items-center overflow-hidden rounded whitespace-nowrap"
                                                >
                                                    <span className="px-selectable-x py-selectable-y">{label}</span>
                                                    <ComboboxBase.ChipRemove
                                                        aria-label={`Remove ${label}`}
                                                        render={(subProps) => (
                                                            <Button
                                                                variant="text"
                                                                tone="neutral"
                                                                size="small"
                                                                iconOnly
                                                                {...subProps}
                                                            >
                                                                <span className="text-body-sm flex items-center">
                                                                    <Clear fontSize="inherit" />
                                                                </span>
                                                            </Button>
                                                        )}
                                                    />
                                                </ComboboxBase.Chip>
                                            );
                                        })}
                                    </ComboboxBase.Chips>
                                )}
                                <ComboboxBase.Input
                                    ref={ref}
                                    placeholder={defaultedProps.multiple ? "" : placeholder}
                                    className="py-selectable-y box-border min-w-8 flex-1 border-0 bg-transparent focus:outline-0"
                                />
                            </React.Fragment>
                        )}
                    </ComboboxBase.Value>
                </div>
                <div className="pr-selectable-x gap-selectable-x box-border flex h-full items-center justify-center">
                    {clearable && (
                        <ComboboxBase.Clear
                            className="Clear box-border flex items-center justify-center"
                            aria-label="Clear selection"
                            render={(subProps) => (
                                <Button variant="text" tone="neutral" size="small" iconOnly {...subProps}>
                                    <span className="text-body-sm flex items-center">
                                        <Clear fontSize="inherit" />
                                    </span>
                                </Button>
                            )}
                        />
                    )}

                    <ComboboxBase.Trigger
                        className="box-border flex items-center justify-center"
                        aria-label="Open options"
                    >
                        <UnfoldMore fontSize="inherit" />
                    </ComboboxBase.Trigger>
                </div>
            </ComboboxBase.InputGroup>

            <ComboboxBase.Portal>
                <ComboboxBase.Positioner className="outline-0" sideOffset={4}>
                    <ComboboxBase.Popup className="combobox__popup">
                        <ComboboxBase.Status className="sr-only">
                            {loading ? loadingText : errorText}
                        </ComboboxBase.Status>

                        {errorText ? (
                            <div className="py-selectable-y px-selectable-x italic">{errorText}</div>
                        ) : (
                            <React.Fragment>
                                <ComboboxBase.Empty>
                                    <div className="py-selectable-y px-selectable-x italic">
                                        {loading ? loadingText : noMatchesText}
                                    </div>
                                </ComboboxBase.Empty>

                                <ComboboxBase.List className="combobox__list gap-y-vertical-xs gap-x-horizontal-md grid grid-cols-[1.5rem_1fr]">
                                    {hasGroups
                                        ? (group) => (
                                              <ComboboxBase.Group
                                                  key={group.value}
                                                  items={group.items}
                                                  className="contents"
                                              >
                                                  <span className="col-start-1" />
                                                  <ComboboxBase.GroupLabel
                                                      render={(subProps) => (
                                                          <span {...subProps} className="col-start-2 uppercase">
                                                              <Typography
                                                                  family="body"
                                                                  as="span"
                                                                  size="sm"
                                                                  lineHeight="squished"
                                                                  weight="bolder"
                                                              >
                                                                  {group.value}
                                                              </Typography>
                                                          </span>
                                                      )}
                                                  />

                                                  <ComboboxBase.Collection>
                                                      {(item) => (
                                                          <ComboboxItem
                                                              key={getItemKey(item, rootProps.itemToStringValue as any)}
                                                              item={item}
                                                              itemToStringLabel={
                                                                  rootProps.itemToStringLabel as
                                                                      | ((item: TValue) => string)
                                                                      | undefined
                                                              }
                                                          />
                                                      )}
                                                  </ComboboxBase.Collection>
                                              </ComboboxBase.Group>
                                          )
                                        : (item) => (
                                              <ComboboxItem
                                                  key={getItemKey(item, rootProps.itemToStringValue as any)}
                                                  item={item}
                                                  itemToStringLabel={
                                                      rootProps.itemToStringLabel as
                                                          | ((item: TValue) => string)
                                                          | undefined
                                                  }
                                              />
                                          )}
                                </ComboboxBase.List>
                            </React.Fragment>
                        )}
                    </ComboboxBase.Popup>
                </ComboboxBase.Positioner>
            </ComboboxBase.Portal>
        </ComboboxBase.Root>
    );
}

function ComboboxItem<TValue>({
    item,
    itemToStringLabel,
}: {
    item: TValue;
    itemToStringLabel?: (item: TValue) => string;
}) {
    const label = getItemLabel(item, itemToStringLabel);

    return (
        <ComboboxBase.Item
            value={item}
            className="user-select-none py-selectable-y pr-selectable-x gap-vertical-xs data-highlighted:text-accent-strong data-highlighted:bg-accent-hover col-span-2 box-border grid grid-cols-subgrid items-center outline-0 data-highlighted:relative data-highlighted:z-0 data-highlighted:before:absolute data-highlighted:before:-z-1 data-highlighted:before:content-['']"
        >
            <ComboboxBase.ItemIndicator className="pl-selectable-x text-accent-subtle col-start-1 flex items-center">
                <Check fontSize="inherit" />
            </ComboboxBase.ItemIndicator>

            <div className="col-start-2">{label}</div>
        </ComboboxBase.Item>
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
