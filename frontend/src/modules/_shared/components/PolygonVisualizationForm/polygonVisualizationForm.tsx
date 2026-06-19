import { Link, LinkOff } from "@mui/icons-material";
import { parseHex, type Rgb } from "culori";
import { isNaN } from "lodash";

import { Button } from "@lib/newComponents/Button";
import { ColorSelect } from "@lib/newComponents/ColorSelect";
import { Combobox } from "@lib/newComponents/Combobox";
import { NumberInput } from "@lib/newComponents/NumberInput";
import { Switch } from "@lib/newComponents/Switch";
import { Typography } from "@lib/newComponents/Typography";
import {
    calculateBackgroundColorForColor,
    calculateLabelPosition,
    LabelPositionType,
    type PolygonVisualizationSpec,
} from "@modules/_shared/DataProviderFramework/visualization/deckgl/polygonUtils";

export type { LabelPositionType, PolygonVisualizationSpec };

export interface PolygonVisualizationFormProps {
    value: PolygonVisualizationSpec;
    onChange: (value: PolygonVisualizationSpec) => void;
}

export function PolygonVisualizationForm(props: PolygonVisualizationFormProps) {
    function handleStrokeEnabledChange(checked: boolean) {
        props.onChange({ ...props.value, hasStroke: checked });
    }

    function handleStrokeColorChange(color: string) {
        const update: Partial<PolygonVisualizationSpec> = { strokeColor: color };
        if (props.value.colorsLinked) {
            update.fillColor = color;
        }
        props.onChange({ ...props.value, ...update });
    }

    function handleStrokeWeightChange(weight: number | null) {
        if (weight !== null && weight >= 0.5 && weight <= 10 && !isNaN(weight)) {
            props.onChange({ ...props.value, strokeWeight: weight });
        }
    }

    function handleStrokeOpacityChange(newOpacity: number | null) {
        props.onChange({ ...props.value, strokeOpacity: (newOpacity ?? 0) / 100 });
    }

    function handleFillEnabledChange(checked: boolean) {
        props.onChange({ ...props.value, hasFill: checked });
    }

    function handleFillColorChange(color: string) {
        const update: Partial<PolygonVisualizationSpec> = { fillColor: color };
        if (props.value.colorsLinked) {
            update.strokeColor = color;
        }
        props.onChange({ ...props.value, ...update });
    }

    function handleFillOpacityChange(newOpacity: number | null) {
        props.onChange({ ...props.value, fillOpacity: (newOpacity ?? 0) / 100 });
    }

    function handleShowLabelsChange(checked: boolean) {
        props.onChange({ ...props.value, showLabels: checked });
    }

    function handleLabelPositionChange(position: string | null) {
        if (position === null) return;
        props.onChange({ ...props.value, labelPosition: position as LabelPositionType });
    }

    function handleLabelColorChange(color: string) {
        props.onChange({ ...props.value, labelColor: color });
    }

    function handleToggleColorsLinked() {
        props.onChange({ ...props.value, colorsLinked: !props.value.colorsLinked });
    }

    const labelPositionOptions = [
        { value: LabelPositionType.CENTROID, label: "Center of polygon" },
        { value: LabelPositionType.CENTROID_SNAPPED, label: "Center of polygon (snapped to closest point)" },
        { value: LabelPositionType.FIRST_POINT, label: "First point" },
        { value: LabelPositionType.LAST_POINT, label: "Last point" },
    ];

    return (
        <div className="gap-x-sm flex items-stretch">
            <PolylinePreview spec={props.value} className="h-auto w-24" />
            {/* 6 cols: switch | label | link-button | brace | color | inputs */}
            <div className="gap-x-sm gap-y-2xs grid grid-cols-[auto_auto_auto_auto_auto_auto] items-center">
                {/* Stroke row */}
                <Switch checked={props.value.hasStroke} onCheckedChange={handleStrokeEnabledChange} />
                <Typography family="body" variant="strong" size="md" tone="neutral">
                    Stroke
                </Typography>
                {/* Link button — row-span-2, col 3 */}
                <div className="pl-sm row-span-2 flex h-full items-center">
                    <Button
                        iconOnly
                        size="small"
                        variant="ghost"
                        compact
                        pressed={props.value.colorsLinked}
                        onClick={handleToggleColorsLinked}
                        title={props.value.colorsLinked ? "Unlink colors" : "Link colors"}
                    >
                        {props.value.colorsLinked ? <Link /> : <LinkOff />}
                    </Button>
                </div>
                {/* Brace arms — row-span-2, col 4 */}
                <div className="row-span-2 flex h-full flex-col items-start">
                    <div className="border-neutral w-2 flex-1 rounded-tl border-t border-l" />
                    <div className="w-2" />
                    <div className="border-neutral w-2 flex-1 rounded-bl border-b border-l" />
                </div>
                <ColorSelect
                    onValueChange={handleStrokeColorChange}
                    value={props.value.strokeColor}
                    size="small"
                    variant="ghost"
                    compact
                    disabled={!props.value.hasStroke}
                />
                {/* Opacity + stroke weight share the column 50/50 */}
                <div className="gap-x-sm flex">
                    <NumberInput
                        value={props.value.strokeOpacity * 100}
                        min={0}
                        max={100}
                        step={1}
                        scrubAdornment="%"
                        onValueChange={handleStrokeOpacityChange}
                        scrubAreaPosition="end"
                        layoutClassName="grow max-w-48"
                        disabled={!props.value.hasStroke}
                    />
                    <NumberInput
                        min={0.5}
                        max={10}
                        step={0.1}
                        value={props.value.strokeWeight}
                        onValueChange={handleStrokeWeightChange}
                        layoutClassName="w-24"
                        scrubAdornment="px"
                        scrubAreaPosition="end"
                        disabled={!props.value.hasStroke}
                    />
                </div>
                {/* Fill row — cols 3 & 4 occupied by row-span-2 cells */}
                <Switch checked={props.value.hasFill} onCheckedChange={handleFillEnabledChange} />
                <Typography family="body" variant="strong" size="md" tone="neutral">
                    Fill
                </Typography>
                <ColorSelect
                    onValueChange={handleFillColorChange}
                    value={props.value.fillColor}
                    size="small"
                    variant="ghost"
                    compact
                    disabled={!props.value.hasFill}
                />
                <NumberInput
                    min={0}
                    max={100}
                    step={1}
                    value={props.value.fillOpacity * 100}
                    onValueChange={handleFillOpacityChange}
                    scrubAdornment="%"
                    scrubAreaPosition="end"
                    layoutClassName="w-full"
                    disabled={!props.value.hasFill}
                />
                {/* Labels row */}
                <Switch checked={props.value.showLabels} onCheckedChange={handleShowLabelsChange} />
                <Typography family="body" variant="strong" size="md" tone="neutral">
                    Labels
                </Typography>
                <div /> {/* empty col 3 */}
                <div /> {/* empty col 4 */}
                <ColorSelect
                    value={props.value.labelColor}
                    disabled={!props.value.showLabels}
                    onValueChange={handleLabelColorChange}
                    variant="ghost"
                    compact
                    size="small"
                />
                <Combobox
                    disabled={!props.value.showLabels}
                    items={labelPositionOptions}
                    value={props.value.labelPosition}
                    onValueChange={handleLabelPositionChange}
                    layoutClassName="w-full"
                />
            </div>
        </div>
    );
}

// Skewed rectangle — four vertices at distinct positions, in SVG coordinate space
const PREVIEW_X_ARR = [10, 18, 72, 65] as const;
const PREVIEW_Y_ARR = [85, 15, 22, 88] as const;
const PREVIEW_Z_ARR = [0, 0, 0, 0] as const;
const PREVIEW_POINTS = PREVIEW_X_ARR.map((x, i) => `${x},${PREVIEW_Y_ARR[i]}`).join(" ");

// Minimal polygon object matching what calculateLabelPosition needs
const PREVIEW_POLYGON = {
    x_arr: PREVIEW_X_ARR as unknown as number[],
    y_arr: PREVIEW_Y_ARR as unknown as number[],
    z_arr: PREVIEW_Z_ARR as unknown as number[],
    name: "Preview",
    poly_id: 0,
};

function rgbToCss(rgb: Rgb): string {
    return `rgb(${Math.round(rgb.r * 255)},${Math.round(rgb.g * 255)},${Math.round(rgb.b * 255)})`;
}

export function PolylinePreview({ spec, className }: { spec: PolygonVisualizationSpec; className?: string }) {
    const [labelX, labelY] = calculateLabelPosition(PREVIEW_POLYGON as any, spec.labelPosition);
    const labelRgb = parseHex(spec.labelColor) as Rgb | undefined;
    const bgRgb = labelRgb ? calculateBackgroundColorForColor(labelRgb) : { mode: "rgb" as const, r: 0, g: 0, b: 0 };

    return (
        <svg viewBox="0 0 80 100" className={className}>
            <polygon
                points={PREVIEW_POINTS}
                fill={spec.hasFill ? spec.fillColor : "none"}
                fillOpacity={spec.hasFill ? spec.fillOpacity : 0}
                stroke={spec.hasStroke ? spec.strokeColor : "none"}
                strokeWidth={spec.hasStroke ? spec.strokeWeight : 0}
                strokeOpacity={spec.hasStroke ? spec.strokeOpacity : 0}
                strokeLinejoin="round"
            />
            {spec.showLabels && (
                <>
                    <rect
                        x={labelX - 18}
                        y={labelY - 7}
                        width={36}
                        height={14}
                        rx={1}
                        fill={rgbToCss(bgRgb)}
                        fillOpacity={0.6}
                    />
                    <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={9}
                        fill={spec.labelColor}
                    >
                        Label
                    </text>
                </>
            )}
        </svg>
    );
}
