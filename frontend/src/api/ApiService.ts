/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { AxiosHttpRequest } from './core/AxiosHttpRequest';

import { DefaultService } from './services/DefaultService';
import { ExploreService } from './services/ExploreService';
import { GridService } from './services/GridService';
import { InplaceVolumetricsService } from './services/InplaceVolumetricsService';
import { ParametersService } from './services/ParametersService';
import { PvtService } from './services/PvtService';
import { SurfaceService } from './services/SurfaceService';
import { SurfacePolygonsService } from './services/SurfacePolygonsService';
import { TimeseriesService } from './services/TimeseriesService';
import { WellService } from './services/WellService';
import { WellCompletionService } from './services/WellCompletionService';

type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;

export class ApiService {

    public readonly default: DefaultService;
    public readonly explore: ExploreService;
    public readonly grid: GridService;
    public readonly inplaceVolumetrics: InplaceVolumetricsService;
    public readonly parameters: ParametersService;
    public readonly pvt: PvtService;
    public readonly surface: SurfaceService;
    public readonly surfacePolygons: SurfacePolygonsService;
    public readonly timeseries: TimeseriesService;
    public readonly well: WellService;
    public readonly wellCompletion: WellCompletionService;

    public readonly request: BaseHttpRequest;

    constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = AxiosHttpRequest) {
        this.request = new HttpRequest({
            BASE: config?.BASE ?? '/api',
            VERSION: config?.VERSION ?? '0.1.0',
            WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
            CREDENTIALS: config?.CREDENTIALS ?? 'include',
            TOKEN: config?.TOKEN,
            USERNAME: config?.USERNAME,
            PASSWORD: config?.PASSWORD,
            HEADERS: config?.HEADERS,
            ENCODE_PATH: config?.ENCODE_PATH,
        });

        this.default = new DefaultService(this.request);
        this.explore = new ExploreService(this.request);
        this.grid = new GridService(this.request);
        this.inplaceVolumetrics = new InplaceVolumetricsService(this.request);
        this.parameters = new ParametersService(this.request);
        this.pvt = new PvtService(this.request);
        this.surface = new SurfaceService(this.request);
        this.surfacePolygons = new SurfacePolygonsService(this.request);
        this.timeseries = new TimeseriesService(this.request);
        this.well = new WellService(this.request);
        this.wellCompletion = new WellCompletionService(this.request);
    }
}

