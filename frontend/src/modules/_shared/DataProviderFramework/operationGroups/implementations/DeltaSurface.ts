import { getDeltaSurfaceDataOptions } from "@api";
import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import type { SurfaceProviderMeta } from "../../dataProviders/implementations/surfaceProviders/DepthSurfaceProvider";
import { DepthSurfaceProvider } from "../../dataProviders/implementations/surfaceProviders/DepthSurfaceProvider";
import { SurfaceDataFormat, type SurfaceData } from "../../dataProviders/implementations/surfaceProviders/types";
import type { ProviderSnapshot } from "../../interfacesAndTypes/customDataProviderImplementation";
import type {
    CustomOperationGroupImplementation,
    FetchParams,
    OperationGroupInformationAccessors,
} from "../../interfacesAndTypes/customOperationGroupImplementation";
import { Representation } from "../../settings/implementations/RepresentationSetting";

const SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS = [DepthSurfaceProvider];
type SupportedDataProviderImplementations = typeof SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS;

export class DeltaSurface
    implements
        CustomOperationGroupImplementation<SurfaceData, SurfaceProviderMeta, SupportedDataProviderImplementations>
{
    supportedDataProviderImplementations = SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS;
    maxChildrenCount = 2;

    getName(): string {
        return "Delta Surface";
    }

    makeReadableOperationString(elems: string[]): string {
        if (elems.length !== 2) {
            return "";
        }
        return `${elems[0]} - ${elems[1]}`;
    }

    async fetchData(params: FetchParams<SupportedDataProviderImplementations>): Promise<SurfaceData> {
        const addresses: string[] = [];
        const addrBuilder = new SurfaceAddressBuilder();
        for (const child of params.childrenSettings) {
            if (child.providerImplementation === DepthSurfaceProvider) {
                const { ensemble, surfaceName, depthAttribute, representation } = child.settings;
                if (!ensemble || !surfaceName || !depthAttribute) {
                    throw new Error(
                        "Missing required settings for DepthSurfaceProvider in DeltaSurface operation group",
                    );
                }
                addrBuilder.withEnsembleIdent(ensemble);
                addrBuilder.withName(surfaceName);
                addrBuilder.withAttribute(depthAttribute);

                if (representation === Representation.REALIZATION) {
                    const realization = child.settings.realization;
                    addrBuilder.withRealization(realization!);
                    const surfaceAddress = addrBuilder.buildRealizationAddress();
                    const surfAddrStr = encodeSurfAddrStr(surfaceAddress);
                    addresses.push(surfAddrStr);
                    continue;
                }
            }
        }

        const queryOptions = getDeltaSurfaceDataOptions({
            query: {
                surf_a_addr_str: addresses[0],
                surf_b_addr_str: addresses[1],
            },
        });

        const promise = params.fetchQuery(queryOptions).then((data) => ({
            format: SurfaceDataFormat.FLOAT,
            surfaceData: transformSurfaceData(data),
        }));

        return promise as Promise<SurfaceData>;
    }

    makeProviderSnapshot(
        accessors: OperationGroupInformationAccessors<SurfaceData, SupportedDataProviderImplementations>,
    ): ProviderSnapshot<SurfaceData, SurfaceProviderMeta> {
        const data = accessors.getData();
        const surfaceData = data?.surfaceData;
        const sharedSettings = accessors.getSharedSettings();

        return {
            data,
            meta: {
                colorScale: sharedSettings.depthColorScale ?? null,
                showContours: sharedSettings.contours ?? null,
            },
            valueRange: surfaceData ? [surfaceData.value_min, surfaceData.value_max] : null,
            dataLabel: null,
        };
    }
}
