import { defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScaleGradientType, ColorScale as ColorScaleImpl, ColorScaleType } from "@lib/utils/ColorScale";

import { ItemDelegate } from "../../delegates/ItemDelegate";
import type { Item, SerializedColorScale } from "../../interfaces";
import { SerializedType } from "../../interfaces";
import type { LayerManager } from "../LayerManager/LayerManager";
import { LayerManagerTopic } from "../LayerManager/LayerManager";

export class ColorScale implements Item {
    private _itemDelegate: ItemDelegate;
    private _colorScale: ColorScaleImpl = new ColorScaleImpl({
        colorPalette: defaultContinuousSequentialColorPalettes[0],
        gradientType: ColorScaleGradientType.Sequential,
        type: ColorScaleType.Continuous,
        steps: 10,
    });
    private _areBoundariesUserDefined: boolean = false;

    constructor(name: string, layerManager: LayerManager) {
        this._itemDelegate = new ItemDelegate(name, layerManager);
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
            ...this._itemDelegate.serializeState(),
            type: SerializedType.COLOR_SCALE,
            colorScale: this._colorScale.serialize(),
            userDefinedBoundaries: this._areBoundariesUserDefined,
        };
    }

    deserializeState(serialized: SerializedColorScale): void {
        this._itemDelegate.deserializeState(serialized);
        this._colorScale = ColorScaleImpl.fromSerialized(serialized.colorScale);
        this._areBoundariesUserDefined = serialized.userDefinedBoundaries;
    }
}
