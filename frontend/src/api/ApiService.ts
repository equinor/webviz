/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { AxiosHttpRequest } from './core/AxiosHttpRequest';

import { CorrelationsService } from './services/CorrelationsService';
import { DefaultService } from './services/DefaultService';
import { ExploreService } from './services/ExploreService';
import { InplaceVolumetricsService } from './services/InplaceVolumetricsService';
import { ParametersService } from './services/ParametersService';
import { SurfaceService } from './services/SurfaceService';
import { TimeseriesService } from './services/TimeseriesService';

type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;

export class ApiService {

    public readonly correlations: CorrelationsService;
    public readonly default: DefaultService;
    public readonly explore: ExploreService;
    public readonly inplaceVolumetrics: InplaceVolumetricsService;
    public readonly parameters: ParametersService;
    public readonly surface: SurfaceService;
    public readonly timeseries: TimeseriesService;

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

        this.correlations = new CorrelationsService(this.request);
        this.default = new DefaultService(this.request);
        this.explore = new ExploreService(this.request);
        this.inplaceVolumetrics = new InplaceVolumetricsService(this.request);
        this.parameters = new ParametersService(this.request);
        this.surface = new SurfaceService(this.request);
        this.timeseries = new TimeseriesService(this.request);
    }
}

