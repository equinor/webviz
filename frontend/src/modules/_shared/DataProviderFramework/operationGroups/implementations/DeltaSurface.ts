import { DepthSurfaceProvider } from "../../dataProviders/implementations/surfaceProviders/DepthSurfaceProvider";
import type {
    CustomOperationGroupImplementation,
    FetchParams,
} from "../../interfacesAndTypes/customOperationGroupImplementation";

const SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS = [DepthSurfaceProvider];
type SupportedDataProviderImplementations = typeof SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS;

export class DeltaSurface
    implements CustomOperationGroupImplementation<[], string, SupportedDataProviderImplementations>
{
    supportedDataProviderImplementations = SUPPORTED_DATA_PROVIDER_IMPLEMENTATIONS;

    getName(): string {
        return "Delta Surface";
    }

    async fetchData(params: FetchParams<SupportedDataProviderImplementations>): Promise<string> {
        params.childrenSettings.forEach((childSetting, index) => {
            if (childSetting.providerImplementation === DepthSurfaceProvider) {
                const depthSurfaceSettings = childSetting.settings;
                // You can now access depthSurfaceSettings with proper typing
            }
        });
        // Implement delta surface fetching logic here
        return "Delta Surface Data";
    }
}
