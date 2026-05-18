import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";
import type { ComboboxRootProps } from "@base-ui/react";
import { Check, Clear, UnfoldMore } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { PortalContainerContext } from "../_shared/portalContainerContext";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/wrapperProps";
import { CircularProgress } from "../CircularProgress";
import { Typography } from "../Typography";
import { SelectableSize, SELECTABLE_SIZES_CLASSNAMES } from "../_shared/size";

export type ComboboxItem<TValue> = {
    value: TValue;
    label: string;
    disabled?: boolean;
};

export type ComboboxGroup<TValue> = {
    value: string;
    items: ComboboxItem<TValue>[];
    disabled?: boolean;
};

type ComboboxItems<TValue> = ComboboxItem<TValue>[] | ComboboxGroup<TValue>[];

function isGroupedItems<TValue>(items: ComboboxItems<TValue> | undefined): items is ComboboxGroup<TValue>[] {
    return Array.isArray(items) && items.length > 0 && "items" in Object(items[0]);
}

export type AsyncState = {
    loading?: boolean;
    loadingText?: React.ReactNode;
    errorText?: React.ReactNode;
};

export type ComboboxProps<TValue, TMultiple extends boolean | undefined = false> = ComponentWrapperProps<
    Omit<
        ComboboxRootProps<TValue, TMultiple>,
        "items" | "itemToStringLabel" | "itemToStringValue" | "isItemEqualToValue"
    >
> &
    AsyncState & {
        items: ComboboxItems<TValue>;
        placeholder?: string;
        noMatchesText?: React.ReactNode;
        clearable?: boolean;
        renderItemAdornment?: (item: TValue) => React.ReactNode;
        /** Only applies when `multiple` is true. "chips" (default) renders a chip per selection; "count" renders "X/N selected". */
        selectionMode?: "chips" | "count";
        size?: SelectableSize;
    };

function getItemValueKey<TValue>(item: TValue): React.Key {
    return (item as any).value ?? String(item);
}

function ComboboxComponent<TValue, TMultiple extends boolean | undefined = false>(
    props: ComboboxProps<TValue, TMultiple>,
    ref: React.ForwardedRef<HTMLInputElement>,
) {
    const portalContainer = React.useContext(PortalContainerContext);

    const {
        placeholder = "Select an option",
        noMatchesText = "No matches found",
        loadingText = (
            <span className="gap-horizontal-sm flex items-center">
                <CircularProgress size={16} />
                Loading options
            </span>
        ),
        clearable = false,
        renderItemAdornment,
        selectionMode = "chips",
        size = "default",
        ...rest
    } = props;
    const baseProps = resolveWrapperProps(rest, "items", "loading", "errorText");

    const hasGroups = isGroupedItems(props.items);
    const listCols = renderItemAdornment ? "grid-cols-[1.5rem_auto_1fr]" : "grid-cols-[1.5rem_1fr]";
    const itemColSpan = renderItemAdornment ? "col-span-3" : "col-span-2";

    const flatItems = React.useMemo(
        () =>
            isGroupedItems(props.items) ? props.items.flatMap((g) => g.items) : (props.items as ComboboxItem<TValue>[]),
        [props.items],
    );

    const baseItems = React.useMemo(() => {
        if (isGroupedItems(props.items)) {
            return props.items.map((group) => ({
                ...group,
                items: group.items.map((item) => item.value),
            }));
        }

        return props.items.map((item) => item.value);
    }, [props.items]);

    const itemByValue = React.useMemo(() => {
        return new Map(flatItems.map((item) => [item.value, item]));
    }, [flatItems]);

    function getLabelForValue(value: TValue): string {
        return flatItems.find((item) => item.value === value)?.label ?? String(value);
    }

    return (
        <ComboboxBase.Root
            items={baseItems}
            itemToStringLabel={(value) => getLabelForValue(value as unknown as TValue)}
            {...baseProps}
        >
            <ComboboxBase.InputGroup
                className={resolveClassNames(
                    "form-element gap-horizontal-sm pl-horizontal-sm flex cursor-text items-center",
                    size === "small" ? "pr-horizontal-3xs" : "pr-horizontal-sm",
                    size !== "small" || (props.multiple && selectionMode === "chips") ? "py-vertical-xs" : undefined,
                    SELECTABLE_SIZES_CLASSNAMES[size],
                )}
            >
                {props.multiple && selectionMode === "chips" ? (
                    <ComboboxBase.Chips className="gap-x-horizontal-3xs gap-y-vertical-3xs flex w-full grow flex-wrap items-center">
                        <ComboboxBase.Value>
                            {(value) => (
                                <React.Fragment>
                                    {Array.isArray(value) &&
                                        value.map((item) => {
                                            const label = getLabelForValue(item as unknown as TValue);
                                            const key = String(item);
                                            return (
                                                <ComboboxBase.Chip
                                                    key={key}
                                                    aria-label={label}
                                                    className="gap-horizontal-3xs bg-neutral text-neutral-strong data-highlighted:bg-accent-hover data-highlighted:outline-focus not-data-highlighted:hover:outline-accent focus-within:bg-accent-hover flex items-center overflow-hidden rounded outline-2 outline-offset-1 outline-transparent"
                                                >
                                                    {renderItemAdornment && (
                                                        <div className="pl-horizontal-xs flex shrink-0 items-center">
                                                            {renderItemAdornment(item)}
                                                        </div>
                                                    )}
                                                    <span className="px-horizontal-3xs flex items-center">{label}</span>
                                                    <ComboboxBase.ChipRemove
                                                        aria-label={`Remove ${label}`}
                                                        className="selectable text-body-xs py-0"
                                                    >
                                                        <Clear fontSize="inherit" />
                                                    </ComboboxBase.ChipRemove>
                                                </ComboboxBase.Chip>
                                            );
                                        })}
                                    <ComboboxBase.Input
                                        ref={ref}
                                        placeholder={props.multiple && value.length > 0 ? "" : placeholder}
                                        className="box-border min-w-8 flex-1 border-0 bg-transparent focus:outline-0"
                                    />
                                </React.Fragment>
                            )}
                        </ComboboxBase.Value>
                    </ComboboxBase.Chips>
                ) : props.multiple && selectionMode === "count" ? (
                    <>
                        <div className="min-w-0 grow">
                            <ComboboxBase.Value>
                                {(value) =>
                                    Array.isArray(value) && value.length > 0 ? (
                                        <span className="text-neutral-subtle block truncate">
                                            {`${value.length}/${flatItems.length} selected`}
                                        </span>
                                    ) : (
                                        <span className="text-neutral-subtle block truncate">{placeholder}</span>
                                    )
                                }
                            </ComboboxBase.Value>
                        </div>
                        <ComboboxBase.Input ref={ref} className="sr-only" />
                    </>
                ) : (
                    <>
                        {renderItemAdornment && (
                            <ComboboxBase.Value>
                                {(value) =>
                                    value != null ? (
                                        <div className="flex shrink-0 items-center">
                                            {renderItemAdornment(value as TValue)}
                                        </div>
                                    ) : null
                                }
                            </ComboboxBase.Value>
                        )}
                        <ComboboxBase.Input
                            ref={ref}
                            placeholder={placeholder}
                            className="box-border min-w-0 flex-1 border-0 bg-transparent focus:outline-0"
                        />
                    </>
                )}
                <div className="pr-horizontal-xs gap-selectable-x box-border flex h-full shrink-0 items-center justify-center">
                    {clearable && (
                        <ComboboxBase.Clear
                            className="Clear selectable text-body-sm py-vertical-3xs! box-border flex items-center justify-center"
                            aria-label="Clear selection"
                        >
                            <Clear fontSize="inherit" />
                        </ComboboxBase.Clear>
                    )}
                    {(!props.multiple || selectionMode === "count") && (
                        <ComboboxBase.Trigger
                            className="box-border flex items-center justify-center"
                            aria-label="Open options"
                        >
                            <UnfoldMore fontSize="inherit" />
                        </ComboboxBase.Trigger>
                    )}
                </div>
            </ComboboxBase.InputGroup>

            <ComboboxBase.Portal container={portalContainer}>
                <ComboboxBase.Positioner className="z-tooltip outline-0" sideOffset={4}>
                    <ComboboxBase.Popup className="bg-floating shadow-elevation-floating box-border max-h-96 max-w-(--available-width) min-w-(--anchor-width) origin-(--transform-origin) rounded transition-transform data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                        <ComboboxBase.Status className="sr-only">
                            {props.loading ? loadingText : props.errorText}
                        </ComboboxBase.Status>

                        {props.errorText ? (
                            <div className="py-selectable-y px-selectable-x italic">{props.errorText}</div>
                        ) : (
                            <React.Fragment>
                                <ComboboxBase.Empty>
                                    <div className="py-selectable-y px-selectable-x italic">
                                        {props.loading ? loadingText : noMatchesText}
                                    </div>
                                </ComboboxBase.Empty>

                                <ComboboxBase.List
                                    className={`gap-x-horizontal-xs box-border grid max-h-[min(var(--available-height),24rem)] scroll-p-px overflow-y-auto overscroll-contain outline-0 data-empty:p-0 ${listCols}`}
                                >
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
                                                          <span
                                                              className={`bg-floating z-elevated pt-vertical-sm sticky top-0 col-span-2 col-start-1 grid grid-cols-subgrid uppercase ${renderItemAdornment ? "col-span-3" : ""}`}
                                                          >
                                                              <span
                                                                  {...subProps}
                                                                  className={`col-start-2 ${renderItemAdornment ? "col-span-2" : ""}`}
                                                              >
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
                                                          </span>
                                                      )}
                                                  />

                                                  <ComboboxBase.Collection>
                                                      {(value) => {
                                                          const item = itemByValue.get(value as TValue);
                                                          if (!item) return null;

                                                          return (
                                                              <ComboboxItem
                                                                  key={getItemValueKey(item)}
                                                                  item={item}
                                                                  itemColSpan={itemColSpan}
                                                                  renderItemAdornment={renderItemAdornment}
                                                              />
                                                          );
                                                      }}
                                                  </ComboboxBase.Collection>
                                              </ComboboxBase.Group>
                                          )
                                        : (value) => {
                                              const item = itemByValue.get(value as TValue);
                                              if (!item) return null;

                                              return (
                                                  <ComboboxItem
                                                      key={getItemValueKey(item)}
                                                      item={item}
                                                      itemColSpan={itemColSpan}
                                                      renderItemAdornment={renderItemAdornment}
                                                  />
                                              );
                                          }}
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
    itemColSpan,
    renderItemAdornment,
}: {
    item: ComboboxItem<TValue>;
    itemColSpan: string;
    renderItemAdornment?: (item: TValue) => React.ReactNode;
}) {
    return (
        <ComboboxBase.Item
            value={item.value}
            disabled={item.disabled}
            className={`user-select-none py-selectable-y pr-selectable-x gap-vertical-xs data-highlighted:text-accent-strong data-highlighted:bg-accent-hover ${itemColSpan} data-disabled:text-disabled box-border grid grid-cols-subgrid items-center outline-0 data-disabled:cursor-not-allowed data-highlighted:relative data-highlighted:z-0 data-highlighted:before:absolute data-highlighted:before:-z-1 data-highlighted:before:content-['']`}
        >
            <ComboboxBase.ItemIndicator className="pl-selectable-x text-accent-subtle text-body-lg col-start-1 flex items-center">
                <Check fontSize="inherit" />
            </ComboboxBase.ItemIndicator>

            {renderItemAdornment && (
                <div className="col-start-2 flex items-center">{renderItemAdornment(item.value)}</div>
            )}

            <div className={renderItemAdornment ? "col-start-3" : "col-start-2"}>{item.label}</div>
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
