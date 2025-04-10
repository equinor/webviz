import { GridLayer } from "./GridLayer";
import { SeismicLayer } from "./SeismicLayer";
import { SurfaceLayer } from "./SurfaceLayer";
import { SurfacesUncertaintyLayer } from "./SurfacesUncertaintyLayer";
import { LayerType } from "./types";
import { WellpicksLayer } from "./WellpicksLayer";

export class LayerFactory {
    static makeLayer(layerType: LayerType) {
        switch (layerType) {
            case LayerType.GRID:
                return new GridLayer("Grid");
            case LayerType.SEISMIC:
                return new SeismicLayer("Seismic");
            case LayerType.SURFACES:
                return new SurfaceLayer("Surfaces");
            case LayerType.WELLPICKS:
                return new WellpicksLayer("Well picks");
            case LayerType.SURFACES_UNCERTAINTY:
                return new SurfacesUncertaintyLayer("Surfaces uncertainty");
            default:
                throw new Error("Unknown layer type");
        }
    }
}
