import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { Interceptors } from './core/OpenAPI';
import {  } from './core/';

import { DefaultService } from './services.gen';
import { ExploreService } from './services.gen';
import { GraphService } from './services.gen';
import { Grid3DService } from './services.gen';
import { GroupTreeService } from './services.gen';
import { InplaceVolumetricsService } from './services.gen';
import { ObservationsService } from './services.gen';
import { ParametersService } from './services.gen';
import { PolygonsService } from './services.gen';
import { PvtService } from './services.gen';
import { RftService } from './services.gen';
import { SeismicService } from './services.gen';
import { SurfaceService } from './services.gen';
import { TimeseriesService } from './services.gen';
import { VfpService } from './services.gen';
import { WellService } from './services.gen';
import { WellCompletionsService } from './services.gen';

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

	constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = ) {
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
			interceptors: {
				request: config?.interceptors?.request ?? new Interceptors(),
				response: config?.interceptors?.response ?? new Interceptors(),
      },
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
