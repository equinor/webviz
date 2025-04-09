import type { QueryClient } from "@tanstack/query-core";
import { isEqual } from "lodash";

import { postGetPolylineIntersectionOptions } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import type { AdjustedPolylineIntersection } from "@modules/_shared/utils/wellbore";
import { transformPolylineIntersection, transformPolylineIntersectionResult } from "@modules/_shared/utils/wellbore";


import type { BoundingBox } from "./BaseLayer";
import { BaseLayer, LayerTopic } from "./BaseLayer";

export type GridLayerSettings = {
    ensembleIdent: RegularEnsembleIdent | null;
    gridModelName: string | null;
    parameterName: string | null;
    parameterDateOrInterval: string | null;
    realizationNum: number | null;
    polyline: {
        polylineUtmXy: number[];
        actualSectionLengths: number[];
    };
    showMesh: boolean;
    extensionLength: number | null;
};

export class GridLayer extends BaseLayer<GridLayerSettings, AdjustedPolylineIntersection> {
    private _colorScalesParameterMap: Map<string, ColorScale> = new Map();
    private _useCustomColorScaleBoundariesParameterMap = new Map<string, boolean>();
    private _defaultColorScale: ColorScale;

    constructor(name: string) {
        const defaultSettings = {
            ensembleIdent: null,
            gridModelName: null,
            parameterName: null,
            parameterDateOrInterval: null,
            realizationNum: null,
            polyline: {
                polylineUtmXy: [],
                actualSectionLengths: [],
            },
            showMesh: false,
            extensionLength: null,
        };
        super(name, defaultSettings);

        this._defaultColorScale = new ColorScale({
            colorPalette: defaultContinuousSequentialColorPalettes[0],
            gradientType: ColorScaleGradientType.Sequential,
            type: ColorScaleType.Continuous,
            steps: 10,
        });
    }

    getColorScale(): ColorScaleWithName {
        let colorScale = this._defaultColorScale;
        if (this._settings.parameterName !== null) {
            colorScale = this._colorScalesParameterMap.get(this._settings.parameterName) ?? this._defaultColorScale;
        }
        return ColorScaleWithName.fromColorScale(colorScale, this._settings.parameterName ?? super.getName());
    }

    setColorScale(colorScale: ColorScale): void {
        if (this._settings.parameterName === null) {
            return;
        }

        this.notifySubscribers(LayerTopic.DATA);
        this._colorScalesParameterMap.set(this._settings.parameterName ?? "", colorScale);
    }

    private makeBoundingBox(): void {
        if (!this._data || !this._settings.extensionLength) {
            return;
        }

        const minX = -this._settings.extensionLength;
        let maxX = -this._settings.extensionLength;
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;

        for (const section of this._data.fenceMeshSections) {
            maxX += section.sectionLength;

            minY = Math.min(minY, section.minZ);
            maxY = Math.max(maxY, section.maxZ);
        }

        super.setBoundingBox({
            x: [minX, maxX],
            y: [minY, maxY],
            z: [0, 0],
        });
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: GridLayerSettings,
        newSettings: GridLayerSettings,
    ): boolean {
        return (
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent) ||
            prevSettings.gridModelName !== newSettings.gridModelName ||
            prevSettings.parameterName !== newSettings.parameterName ||
            prevSettings.parameterDateOrInterval !== newSettings.parameterDateOrInterval ||
            prevSettings.realizationNum !== newSettings.realizationNum ||
            !isEqual(prevSettings.polyline, newSettings.polyline) ||
            prevSettings.extensionLength !== newSettings.extensionLength
        );
    }

    getBoundingBox(): BoundingBox | null {
        const bbox = super.getBoundingBox();
        if (bbox) {
            return bbox;
        }

        this.makeBoundingBox();
        return super.getBoundingBox();
    }

    getUseCustomColorScaleBoundaries(): boolean {
        return this._useCustomColorScaleBoundariesParameterMap.get(this._settings.parameterName ?? "") ?? false;
    }

    setUseCustomColorScaleBoundaries(useCustomColorScaleBoundaries: boolean): void {
        this._useCustomColorScaleBoundariesParameterMap.set(
            this._settings.parameterName ?? "",
            useCustomColorScaleBoundaries,
        );
        this.notifySubscribers(LayerTopic.DATA);
    }

    protected areSettingsValid(): boolean {
        return (
            this._settings.ensembleIdent !== null &&
            this._settings.gridModelName !== null &&
            this._settings.parameterName !== null &&
            this._settings.realizationNum !== null &&
            this._settings.polyline.polylineUtmXy.length > 0 &&
            this._settings.polyline.actualSectionLengths.length ===
                this._settings.polyline.polylineUtmXy.length / 2 - 1 &&
            this._settings.extensionLength !== null
        );
    }

    protected async fetchData(queryClient: QueryClient): Promise<AdjustedPolylineIntersection> {
        super.setBoundingBox(null);

        const queryOptions = postGetPolylineIntersectionOptions({
            query: {
                case_uuid: this._settings.ensembleIdent?.getCaseUuid() ?? "",
                ensemble_name: this._settings.ensembleIdent?.getEnsembleName() ?? "",
                grid_name: this._settings.gridModelName ?? "",
                parameter_name: this._settings.parameterName ?? "",
                realization_num: this._settings.realizationNum ?? 0,
                parameter_time_or_interval_str: this._settings.parameterDateOrInterval ?? null,
            },
            body: {
                polyline_utm_xy: this._settings.polyline.polylineUtmXy,
            },
        });

        this.registerQueryKey(queryOptions.queryKey);

        return queryClient
            .fetchQuery({
                ...queryOptions,
            })
            .then((data) => transformPolylineIntersection(data))
            .then((data) => transformPolylineIntersectionResult(data, this._settings.polyline.actualSectionLengths));
    }
}

export function isGridLayer(layer: BaseLayer<any, any>): layer is GridLayer {
    return layer instanceof GridLayer;
}
