/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { AxiosHttpRequest } from './core/AxiosHttpRequest';
import { DefaultService } from './services/DefaultService';
import { ExploreService } from './services/ExploreService';
import { GraphService } from './services/GraphService';
import { Grid3DService } from './services/Grid3DService';
import { GroupTreeService } from './services/GroupTreeService';
import { InplaceVolumetricsService } from './services/InplaceVolumetricsService';
import { ObservationsService } from './services/ObservationsService';
import { ParametersService } from './services/ParametersService';
import { PolygonsService } from './services/PolygonsService';
import { PvtService } from './services/PvtService';
import { RftService } from './services/RftService';
import { SeismicService } from './services/SeismicService';
import { SurfaceService } from './services/SurfaceService';
import { TimeseriesService } from './services/TimeseriesService';
import { VfpService } from './services/VfpService';
import { WellService } from './services/WellService';
import { WellCompletionsService } from './services/WellCompletionsService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class ApiService {
    public readonly default: DefaultService;
    public readonly explore: ExploreService;
    public readonly graph: GraphService;
    public readonly grid3D: Grid3DService;
    public readonly groupTree: GroupTreeService;
    public readonly inplaceVolumetrics: InplaceVolumetricsService;
    public readonly observations: ObservationsService;
    public readonly parameters: ParametersService;
    public readonly polygons: PolygonsService;
    public readonly pvt: PvtService;
    public readonly rft: RftService;
    public readonly seismic: SeismicService;
    public readonly surface: SurfaceService;
    public readonly timeseries: TimeseriesService;
    public readonly vfp: VfpService;
    public readonly well: WellService;
    public readonly wellCompletions: WellCompletionsService;
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
        this.graph = new GraphService(this.request);
        this.grid3D = new Grid3DService(this.request);
        this.groupTree = new GroupTreeService(this.request);
        this.inplaceVolumetrics = new InplaceVolumetricsService(this.request);
        this.observations = new ObservationsService(this.request);
        this.parameters = new ParametersService(this.request);
        this.polygons = new PolygonsService(this.request);
        this.pvt = new PvtService(this.request);
        this.rft = new RftService(this.request);
        this.seismic = new SeismicService(this.request);
        this.surface = new SurfaceService(this.request);
        this.timeseries = new TimeseriesService(this.request);
        this.vfp = new VfpService(this.request);
        this.well = new WellService(this.request);
        this.wellCompletions = new WellCompletionsService(this.request);
    }
}

