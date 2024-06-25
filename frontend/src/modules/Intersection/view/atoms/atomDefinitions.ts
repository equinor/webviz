import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalSettingsToViewInterface } from "@framework/UniDirectionalSettingsToViewInterface";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { arrayPointToPoint2D, pointDistance } from "@lib/utils/geometry";
import { SettingsToViewInterface } from "@modules/Intersection/settingsToViewInterface";
import { CURVE_FITTING_EPSILON } from "@modules/Intersection/typesAndEnums";
import { BaseLayer } from "@modules/Intersection/utils/layers/BaseLayer";
import { isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { isSurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { isWellpicksLayer } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";

import { atom } from "jotai";

import { wellboreTrajectoryQueryAtom } from "./queryAtoms";

export type ViewAtoms = {
    layers: BaseLayer<any, any>[];
    intersectionReferenceSystemAtom: IntersectionReferenceSystem | null;
    polylineAtom: {
        polylineUtmXy: number[];
        actualSectionLengths: number[];
    };
};

export function viewAtomsInitialization(
    settingsToViewInterface: UniDirectionalSettingsToViewInterface<SettingsToViewInterface>
): ModuleAtoms<ViewAtoms> {
    const selectedCustomIntersectionPolylineAtom = atom((get) => {
        const customIntersectionPolylineId = get(
            settingsToViewInterface.getAtom("selectedCustomIntersectionPolylineId")
        );
        const customIntersectionPolylines = get(IntersectionPolylinesAtom);

        return customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId);
    });

    const intersectionReferenceSystemAtom = atom((get) => {
        const wellboreTrajectoryQuery = get(wellboreTrajectoryQueryAtom);
        const customIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));

        if (intersectionType === IntersectionType.WELLBORE) {
            if (!wellboreTrajectoryQuery.data) {
                return null;
            }

            const wellboreTrajectory = wellboreTrajectoryQuery.data;

            if (wellboreTrajectoryQuery) {
                const path: number[][] = [];
                for (const [index, northing] of wellboreTrajectory.northingArr.entries()) {
                    const easting = wellboreTrajectory.eastingArr[index];
                    const tvd_msl = wellboreTrajectory.tvdMslArr[index];

                    path.push([easting, northing, tvd_msl]);
                }
                const offset = wellboreTrajectory.mdArr[0];

                const referenceSystem = new IntersectionReferenceSystem(path);
                referenceSystem.offset = offset;

                return referenceSystem;
            }
        } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && customIntersectionPolyline) {
            if (customIntersectionPolyline.points.length < 2) {
                return null;
            }
            const referenceSystem = new IntersectionReferenceSystem(
                customIntersectionPolyline.points.map((point) => [point[0], point[1], 0])
            );
            referenceSystem.offset = 0;

            return referenceSystem;
        }

        return null;
    });

    const polylineAtom = atom((get) => {
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));
        const intersectionExtensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));
        const selectedCustomIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
        const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);

        const polylineUtmXy: number[] = [];
        const actualSectionLengths: number[] = [];

        if (intersectionReferenceSystem) {
            if (intersectionType === IntersectionType.WELLBORE) {
                const path = intersectionReferenceSystem.path;
                const simplifiedCurveResult = calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                    path,
                    intersectionExtensionLength,
                    CURVE_FITTING_EPSILON
                );
                polylineUtmXy.push(...simplifiedCurveResult.simplifiedWellboreTrajectoryXy.flat());
                actualSectionLengths.push(...simplifiedCurveResult.actualSectionLengths);
            } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && selectedCustomIntersectionPolyline) {
                for (const [index, point] of selectedCustomIntersectionPolyline.points.entries()) {
                    polylineUtmXy.push(point[0], point[1]);
                    if (index > 0) {
                        const previousPoint = selectedCustomIntersectionPolyline.points[index - 1];
                        actualSectionLengths.push(
                            pointDistance(arrayPointToPoint2D(point), arrayPointToPoint2D(previousPoint))
                        );
                    }
                }
            }
        }

        return {
            polylineUtmXy,
            actualSectionLengths,
        };
    });

    const layers = atom((get) => {
        const layers = get(settingsToViewInterface.getAtom("layers"));
        const ensembleIdent = get(settingsToViewInterface.getAtom("ensembleIdent"));
        const wellbore = get(settingsToViewInterface.getAtom("wellboreHeader"));
        const polyline = get(polylineAtom);
        const extensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));

        for (const layer of layers) {
            if (isGridLayer(layer)) {
                layer.maybeUpdateSettings({ polyline, extensionLength });
            }
            if (isSeismicLayer(layer)) {
                layer.maybeUpdateSettings({ polylineUtmXy: polyline.polylineUtmXy, extensionLength });
            }
            if (isSurfaceLayer(layer)) {
                layer.maybeUpdateSettings({ polylineUtmXy: polyline.polylineUtmXy, extensionLength });
            }
            if (isWellpicksLayer(layer)) {
                layer.maybeUpdateSettings({
                    ensembleIdent,
                    wellboreUuid: intersectionType === IntersectionType.WELLBORE ? wellbore?.uuid : null,
                });
            }
            layer.maybeRefetchData();
        }

        return layers;
    });

    return {
        layers,
        intersectionReferenceSystemAtom,
        polylineAtom,
    };
}
