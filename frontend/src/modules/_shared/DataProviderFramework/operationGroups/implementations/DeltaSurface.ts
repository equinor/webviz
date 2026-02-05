import { SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { DepthSurfaceProvider } from "../../dataProviders/implementations/surfaceProviders/DepthSurfaceProvider";
import type {
    CustomOperationGroupImplementation,
    FetchParams,
} from "../../interfacesAndTypes/customOperationGroupImplementation";
import { Representation } from "../../settings/implementations/RepresentationSetting";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { getDeltaSurfaceData, getDeltaSurfaceDataOptions, getDeltaSurfaceDataOptions } from "@api";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import type { SurfaceData } from "../../dataProviders/implementations/surfaceProviders/types";

const SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS = [DepthSurfaceProvider];
type SupportedDataProviderImplementations = typeof SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS;

export class DeltaSurface implements CustomOperationGroupImplementation<SurfaceData, SupportedDataProviderImplementations> {
    supportedDataProviderImplementations = SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS;

    getName(): string {
        return "Delta Surface";
    }

    async fetchData(params: FetchParams<SupportedDataProviderImplementations>): Promise<SurfaceData> {
        const addresses: string[] = [];
        const addrBuilder = new SurfaceAddressBuilder();
        for (const child of params.childrenSettings) {
            if (child.providerImplementation === DepthSurfaceProvider) {
                const {ensemble, surfaceName, depthAttribute, representation} = child.settings;
                if (!ensemble || !surfaceName || !depthAttribute) {
                    throw new Error("Missing required settings for DepthSurfaceProvider in DeltaSurface operation group");
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

        const queryOptions = getDeltaSurfaceDataOptions({
            query: {
                surf_a_addr_str: addresses[0],
                surf_b_addr_str: addresses[1],
            },
        });
        
        const promise = params.fetchQuery(queryOptions).then((data) => ({
                            surfaceData: transformSurfaceData(data),
                        }));
    }
}
