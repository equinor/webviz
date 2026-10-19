import type { SelectableSize } from "@lib/components/_shared/utils/size";
import { getNextTextSize, getTextSizeForSelectableSize } from "@lib/components/_shared/utils/size";
import { Typography } from "@lib/components/Typography";

export type MarkerLabelProps = {
    leftPosPercent: number;
    size: SelectableSize;
    value: number;
    index: number;
    numMarkers: number;
    disabled?: boolean;
    labelFormat?: (markerValue: number, index: number) => React.ReactNode;
    onClick: (value: number) => void;
};

export function MarkerLabel(props: MarkerLabelProps): React.ReactNode {
    const textSize = getTextSizeForSelectableSize(props.size);

    let formattedValue;

    if (typeof props.labelFormat === "function") {
        formattedValue = props.labelFormat(props.value, props.index);
    } else {
        formattedValue = props.value;
    }

    if (!formattedValue && formattedValue !== 0) {
        return null;
    }

    function handleOnClick() {
        if (props.disabled) return;
        props.onClick(props.value);
    }

    function getTranslateXOverrides() {
        if (props.index === 0) return "calc(var(--thumb-size) * -1)";
        if (props.index === props.numMarkers - 1) return "calc(-100% + var(--thumb-size))";
        return undefined;
    }

    return (
        <Typography
            as="span"
            role="button"
            tabIndex={props.disabled ? -1 : 0}
            aria-disabled={props.disabled ? true : undefined}
            aria-label={`Set slider to ${props.value}`}
            data-disabled={props.disabled ? "" : undefined}
            family="body"
            variant="subtle"
            size={getNextTextSize(textSize, -1)}
            tone="neutral"
            // To make the marker labels "float", while still applying their height to the parent, we cram them all in the same grid cell, and then align them to their markers using a margin
            layoutClassName="cursor-pointer font-bolder px-2xs py-4xs block -translate-x-1/2 rounded-sm not-data-disabled:hover:bg-input focus:outline-focus justify-self-start whitespace-nowrap"
            layoutStyle={{
                // @ts-expect-error -- CSS type doesn't recognize variables
                "--tw-translate-x": getTranslateXOverrides(),
                marginLeft: `${props.leftPosPercent}%`,
                gridColumn: 1,
                gridRow: 1,
            }}
            onClick={handleOnClick}
            onKeyDown={(evt) => ["Enter", " "].includes(evt.key) && handleOnClick()}
            // ! Slider will move the thumb during pointer-down event, so we stop it here to avoid jumpiness
            onPointerDown={(evt) => !props.disabled && evt.stopPropagation()}
        >
            {formattedValue}
        </Typography>
    );
}
