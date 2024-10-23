import { defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorScale as ColorScaleImpl } from "@lib/utils/ColorScale";

import { LayerManagerTopic } from "./LayerManager";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { Item, SerializedColorScale } from "./interfaces";

export class ColorScale implements Item {
    private _itemDelegate: ItemDelegate;
    private _colorScale: ColorScaleImpl = new ColorScaleImpl({
        colorPalette: defaultContinuousSequentialColorPalettes[0],
        gradientType: ColorScaleGradientType.Sequential,
        type: ColorScaleType.Continuous,
        steps: 10,
    });
    private _areBoundariesUserDefined: boolean = false;

    constructor(name: string) {
        this._itemDelegate = new ItemDelegate(name);
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getColorScale(): ColorScaleImpl {
        return this._colorScale;
    }

    setColorScale(colorScale: ColorScaleImpl): void {
        this._colorScale = colorScale;
        this.getItemDelegate().getLayerManager()?.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
    }

    getAreBoundariesUserDefined(): boolean {
        return this._areBoundariesUserDefined;
    }

    setAreBoundariesUserDefined(areBoundariesUserDefined: boolean): void {
        this._areBoundariesUserDefined = areBoundariesUserDefined;
        this.getItemDelegate().getLayerManager()?.publishTopic(LayerManagerTopic.LAYER_DATA_REVISION);
    }

    serializeState(): SerializedColorScale {
        return {
            type: "color-scale",
            name: this._itemDelegate.getName(),
            id: this._itemDelegate.getId(),
            colorScale: this._colorScale.serialize(),
            userDefinedBoundaries: this._areBoundariesUserDefined,
        };
    }

    deserializeState(serialized: SerializedColorScale): void {
        this._itemDelegate.setName(serialized.name);
        this._itemDelegate.setId(serialized.id);
        this._colorScale = ColorScaleImpl.fromSerialized(serialized.colorScale);
        this._areBoundariesUserDefined = serialized.userDefinedBoundaries;
    }
}
