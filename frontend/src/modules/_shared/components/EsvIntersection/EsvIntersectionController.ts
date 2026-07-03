import type { AxisOptions, IntersectionReferenceSystem, Layer, OnRescaleEvent } from "@equinor/esv-intersection";
import {
    CalloutCanvasLayer as EsvCalloutCanvasLayer,
    Controller,
    GeomodelCanvasLayer as EsvGeomodelCanvasLayer,
    GeomodelLabelsLayer as EsvGeomodelLabelsLayer,
    GeomodelLayerV2 as EsvGeomodelLayerV2,
    GridLayer,
    ImageLayer as EsvImageLayer,
    PixiRenderApplication,
    ReferenceLineLayer as EsvReferenceLineLayer,
    SchematicLayer as EsvSchematicLayer,
    SeismicCanvasLayer as EsvSeismicCanvasLayer,
    WellborepathLayer as EsvWellborepathLayer,
} from "@equinor/esv-intersection";
import { cloneDeep, isEqual } from "lodash-es";

import type { Viewport } from "@framework/types/viewport";
import { fuzzyCompare } from "@lib/utils/fuzzyCompare";
import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

import type { EsvLayer, EsvLayerOptionsMap } from "./EsvLayer";
import { EsvLayerType } from "./EsvLayer";
import { InteractionHandler, InteractionHandlerTopic } from "./interaction/InteractionHandler";
import { PolylineIntersectionLayer as EsvPolylineIntersectionLayer } from "./layers/PolylineIntersectionLayer";
import { SeismicLayer as EsvSeismicLayer } from "./layers/SeismicLayer";
import { SurfaceStatisticalFanchartsCanvasLayer as EsvSurfaceStatisticalFanchartsCanvasLayer } from "./layers/SurfaceStatisticalFanchartCanvasLayer";
import type { HighlightItem, ReadoutItem } from "./types/types";
import { isValidBounds, isValidViewport } from "./utils/validationUtils";

export type Bounds = {
    x: [number, number];
    y: [number, number];
};

export enum EsvIntersectionLifeCycleState {
    NOT_INITIALIZED = "NOT_INITIALIZED",
    INITIALIZING = "INITIALIZING",
    INITIALIZED = "INITIALIZED",
    ERROR = "ERROR",
    DESTROYED = "DESTROYED",
}

export enum EsvIntersectionControllerTopic {
    LIFE_CYCLE_STATE_CHANGE = "LIFE_CYCLE_STATE_CHANGE",
    VIEWPORT_CHANGE = "VIEWPORT_CHANGE",
    READOUT_ITEMS_CHANGE = "READOUT_ITEMS_CHANGE",
    MOUSE_POSITION_CHANGE = "MOUSE_POSITION_CHANGE",
}

export type EsvIntersectionControllerTopicPayload = {
    [EsvIntersectionControllerTopic.LIFE_CYCLE_STATE_CHANGE]: EsvIntersectionLifeCycleState;
    [EsvIntersectionControllerTopic.VIEWPORT_CHANGE]: Viewport | null;
    [EsvIntersectionControllerTopic.READOUT_ITEMS_CHANGE]: ReadoutItem[];
    [EsvIntersectionControllerTopic.MOUSE_POSITION_CHANGE]: { x: number; y: number } | null;
};

export class EsvIntersectionController implements PublishSubscribe<EsvIntersectionControllerTopicPayload> {
    // --- Lifecycle ---
    private _lifeCycleState: EsvIntersectionLifeCycleState = EsvIntersectionLifeCycleState.NOT_INITIALIZED;

    // --- Core ESV objects (null until initialized) ---
    private _container: HTMLElement | null = null;
    private _esvController: Controller | null = null;
    private _pixiRenderApplication: PixiRenderApplication | null = null;
    private _interactionHandler: InteractionHandler | null = null;

    // Live ESV layer instances keyed by user-supplied layer ID
    private _esvLayerMap: Map<string, Layer<unknown>> = new Map();

    // --- Buffered desired state ---
    // Callers may set these before initialize(); they are applied in full once initialized.
    //
    // _userLayerMap holds the last applied EsvLayer definition per ID. It serves two purposes:
    //   1. Change detection: compare incoming options against the stored definition before calling onUpdate.
    //   2. Ordered iteration: Map preserves insertion order, matching the array order passed by the caller.
    // _esvLayerMap holds the live ESV layer instances that back each user layer.
    private _userLayerMap: Map<string, EsvLayer> = new Map();
    private _layers: EsvLayer[] = [];
    private _viewport: Viewport | null = null;
    private _bounds: Bounds | null = null;
    private _zFactor: number = 1;
    private _showGrid: boolean = false;
    private _showAxes: boolean = false;
    private _showAxesLabels: boolean = false;
    private _axesOptions: AxisOptions | null = null;
    private _intersectionReferenceSystem: IntersectionReferenceSystem | null = null;
    private _highlightItems: HighlightItem[] = [];
    private _containerSize: { width: number; height: number } | null = null;
    private _intersectionThreshold: number = 10;

    // --- Internal viewport tracking ---
    // Programmatic changes (setBounds, setViewport, resize, reference system) set this flag so the
    // patched onRescale callback does not re-emit them as user-driven viewport changes.
    private _programmaticViewportChangeInProgress: boolean = false;
    // A single resize fires multiple onRescale callbacks. This stays true until the
    // requestAnimationFrame after the resize settles, suppressing all of them.
    private _resizeInProgress: boolean = false;
    // The viewport currently applied to the canvas. Guards against redundant setViewport calls.
    private _canvasViewport: Viewport | null = null;

    // --- Pub/sub ---
    private _pubSubDelegate = new PublishSubscribeDelegate<EsvIntersectionControllerTopicPayload>();

    // Snapshot values — returned by makeSnapshotGetter, pulled by subscribers after notification
    private _latestViewport: Viewport | null = null;
    private _latestReadoutItems: ReadoutItem[] = [];
    private _latestMousePosition: { x: number; y: number } | null = null;

    makeSnapshotGetter<T extends EsvIntersectionControllerTopic>(
        topic: T,
    ): () => EsvIntersectionControllerTopicPayload[T] {
        const getters = {
            [EsvIntersectionControllerTopic.LIFE_CYCLE_STATE_CHANGE]: () => this._lifeCycleState,
            [EsvIntersectionControllerTopic.VIEWPORT_CHANGE]: () => this._latestViewport,
            [EsvIntersectionControllerTopic.READOUT_ITEMS_CHANGE]: () => this._latestReadoutItems,
            [EsvIntersectionControllerTopic.MOUSE_POSITION_CHANGE]: () => this._latestMousePosition,
        };
        return getters[topic] as () => EsvIntersectionControllerTopicPayload[T];
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<EsvIntersectionControllerTopicPayload> {
        return this._pubSubDelegate;
    }

    async initialize(container: HTMLElement): Promise<void> {
        const currentState = this._lifeCycleState;
        if (currentState !== EsvIntersectionLifeCycleState.NOT_INITIALIZED) {
            throw new Error(`Cannot initialize: controller is already in state '${currentState}'`);
        }

        this._container = container;
        this.setLifeCycleState(EsvIntersectionLifeCycleState.INITIALIZING);

        try {
            // Initialise Pixi FIRST — before touching the DOM. PixiRenderApplication.init()
            // creates its own off-screen canvas (context: null) so it does not need the
            // container yet. This means React Strict Mode can run the effect cleanup (calling
            // destroy()) during the await without leaving orphaned DOM elements in the
            // container, which would conflict with the next controller's initialisation.
            const pixiRenderApplication = new PixiRenderApplication();
            await pixiRenderApplication.init({
                context: null,
                antialias: true,
                hello: false,
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                backgroundColor: "#fff",
                clearBeforeRender: true,
                backgroundAlpha: 0,
            });

            // Guard: destroy() was called while awaiting Pixi init. Return immediately
            // without touching the container — no DOM cleanup needed because we have not
            // created the ESV Controller yet.
            if (this._lifeCycleState === EsvIntersectionLifeCycleState.DESTROYED) {
                return;
            }

            // Only reach here when the controller is still alive. Create the ESV Controller
            // now (DOM mutations happen here) so the container is only touched once.
            const esvController = new Controller({
                container,
                axisOptions: { xLabel: "", yLabel: "", unitOfMeasure: "" },
            });

            // Patch onRescale to distinguish user-driven pan/zoom from programmatic viewport changes.
            const originalOnRescale = esvController.zoomPanHandler.onRescale;
            esvController.zoomPanHandler.onRescale = (event: OnRescaleEvent) => {
                this.handleRescale(event);
                originalOnRescale(event);
            };

            // Grid layer is always present; visibility is toggled via showGrid.
            const gridLayer = new GridLayer("grid", { order: 1 });
            esvController.addLayer(gridLayer);
            esvController.hideLayer("grid");
            esvController.hideAxisLabels();

            const interactionHandler = new InteractionHandler(esvController, container, {
                intersectionOptions: { threshold: this._intersectionThreshold },
            });

            interactionHandler.subscribe(InteractionHandlerTopic.READOUT_ITEMS_CHANGE, ({ items }) => {
                this._latestReadoutItems = items;
                this._pubSubDelegate.notifySubscribers(EsvIntersectionControllerTopic.READOUT_ITEMS_CHANGE);
            });

            this._esvController = esvController;
            this._pixiRenderApplication = pixiRenderApplication;
            this._interactionHandler = interactionHandler;

            this.setLifeCycleState(EsvIntersectionLifeCycleState.INITIALIZED);

            // Flush all buffered desired state now that the controller is live.
            this.applyAxesOptions();
            this.applyShowGrid();
            this.applyShowAxes();
            this.applyShowAxesLabels();
            this.applyZFactor();
            this.applyIntersectionReferenceSystem();
            this.applyHighlightItems();
            this.applyBounds();
            this.syncLayers();
            this.applyViewport();
            this.applyResize();
        } catch (error) {
            this.setLifeCycleState(EsvIntersectionLifeCycleState.ERROR);
            throw error;
        }
    }

    destroy(): void {
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.DESTROYED) {
            return;
        }

        // Notify subscribers before tearing down so they can react while the state is still readable.
        this.setLifeCycleState(EsvIntersectionLifeCycleState.DESTROYED);

        this._interactionHandler?.destroy();
        this._esvController?.destroy();

        this._interactionHandler = null;
        this._pixiRenderApplication = null;
        this._esvController = null;
        this._container = null;

        this._esvLayerMap.clear();
        this._userLayerMap.clear();
    }

    // --- Public setters ---

    setLayers(layers: EsvLayer[]): void {
        this._layers = layers;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.syncLayers();
        }
    }

    setViewport(viewport: Viewport): void {
        if (areViewportsEqual(this._viewport, viewport)) {
            return;
        }

        this._viewport = viewport;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyViewport();
        }
    }

    setBounds(bounds: Bounds): void {
        if (isEqual(bounds, this._bounds)) {
            return;
        }

        this._bounds = bounds;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyBounds();
        }
    }

    setZFactor(zFactor: number): void {
        this._zFactor = zFactor;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyZFactor();
        }
    }

    setShowGrid(show: boolean): void {
        this._showGrid = show;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyShowGrid();
        }
    }

    setShowAxes(show: boolean): void {
        this._showAxes = show;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyShowAxes();
        }
    }

    setShowAxesLabels(show: boolean): void {
        this._showAxesLabels = show;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyShowAxesLabels();
        }
    }

    setAxesOptions(options: AxisOptions): void {
        if (isEqual(options, this._axesOptions)) {
            return;
        }

        this._axesOptions = options;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyAxesOptions();
        }
    }

    setIntersectionReferenceSystem(system: IntersectionReferenceSystem): void {
        if (system === this._intersectionReferenceSystem) {
            return;
        }

        this._intersectionReferenceSystem = system;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyIntersectionReferenceSystem();
        }
    }

    setHighlightItems(items: HighlightItem[]): void {
        if (isEqual(items, this._highlightItems)) {
            return;
        }

        this._highlightItems = items;
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyHighlightItems();
        }
    }

    setIntersectionThreshold(threshold: number): void {
        this._intersectionThreshold = threshold;
        this._interactionHandler?.setIntersectionThreshold(threshold);
    }

    adjustToSize(width: number, height: number): void {
        this._containerSize = { width, height };
        if (this._lifeCycleState === EsvIntersectionLifeCycleState.INITIALIZED) {
            this.applyResize();
        }
    }

    notifyMouseMove(pixelX: number, pixelY: number): void {
        if (!this._esvController) return;
        const { xScale, yScale } = this._esvController.currentStateAsEvent;
        this._latestMousePosition = { x: xScale.invert(pixelX), y: yScale.invert(pixelY) };
        this._pubSubDelegate.notifySubscribers(EsvIntersectionControllerTopic.MOUSE_POSITION_CHANGE);
    }

    notifyMouseLeave(): void {
        this._latestMousePosition = null;
        this._pubSubDelegate.notifySubscribers(EsvIntersectionControllerTopic.MOUSE_POSITION_CHANGE);
    }

    // --- Private helpers ---

    private setLifeCycleState(state: EsvIntersectionLifeCycleState): void {
        this._lifeCycleState = state;
        this._pubSubDelegate.notifySubscribers(EsvIntersectionControllerTopic.LIFE_CYCLE_STATE_CHANGE);
    }

    private handleRescale(event: OnRescaleEvent): void {
        if (this._resizeInProgress || this._canvasViewport === null || this._programmaticViewportChangeInProgress) {
            return;
        }

        const k = event.transform.k;
        if (k === 0 || Number.isNaN(k)) return;

        const xSpan = this._esvController!.zoomPanHandler.xSpan;
        const displ = xSpan / k;
        const unitsPerPixel = displ / event.width;

        const cx = event.xBounds[0] - event.transform.x * unitsPerPixel + displ / 2;
        const cy =
            event.yBounds[0] -
            event.transform.y * (unitsPerPixel / event.zFactor) +
            displ / event.zFactor / event.viewportRatio / 2;

        const candidateViewport: Viewport = [cx, cy, displ];
        if (!isValidViewport(candidateViewport)) return;
        if (areViewportsEqual(candidateViewport, this._canvasViewport)) return;

        this._canvasViewport = candidateViewport;
        this._latestViewport = candidateViewport;

        this._pubSubDelegate.notifySubscribers(EsvIntersectionControllerTopic.VIEWPORT_CHANGE);
    }

    // PixiLayer.onUnmount removes its `pixiViewContainer` wrapper div, which takes the shared
    // Pixi canvas out of the DOM as a side-effect. Re-anchoring directly to `.layer-container`
    // keeps the canvas alive across layer add/remove without requiring Pixi layers to be
    // destroyed and re-created just to re-trigger onMount.
    private ensurePixiCanvasInDom(): void {
        if (!this._container || !this._pixiRenderApplication?.renderer) return;
        const canvas = this._pixiRenderApplication.renderer.canvas;
        const layerContainer = this._container.querySelector(".layer-container");
        if (!layerContainer) return;
        if (!layerContainer.contains(canvas)) {
            // Make sure canvas is positioned absolutely so it doesn't affect the layout of other layers.
            canvas.style.position = "absolute";
            canvas.style.inset = "0";
            layerContainer.appendChild(canvas);
        }
    }

    private syncLayers(): void {
        if (!this._esvController || !this._pixiRenderApplication || !this._interactionHandler) {
            return;
        }

        const esvController = this._esvController;
        const pixiApp = this._pixiRenderApplication;
        const interactionHandler = this._interactionHandler;

        const incomingIds = new Set(this._layers.map((l) => l.id));

        // Remove layers no longer in the incoming list
        for (const id of [...this._esvLayerMap.keys()]) {
            if (!incomingIds.has(id)) {
                esvController.removeLayer(id);
                interactionHandler.removeLayer(id);
                this._esvLayerMap.delete(id);
                this._userLayerMap.delete(id);
            }
        }

        // Add or update layers in caller-specified order
        for (const userLayer of this._layers) {
            const existingEsvLayer = this._esvLayerMap.get(userLayer.id);
            const prevUserLayer = this._userLayerMap.get(userLayer.id);

            if (!existingEsvLayer) {
                const opts = cloneDeep(userLayer.options);
                if (opts.order !== undefined) {
                    opts.order += 1;
                }
                const newEsvLayer = makeEsvLayerInstance(userLayer, opts, pixiApp);
                esvController.addLayer(newEsvLayer);
                this._esvLayerMap.set(userLayer.id, newEsvLayer);
                if (userLayer.hoverable) {
                    interactionHandler.addLayer(newEsvLayer);
                }
                this.resizeLayerElement(newEsvLayer);
            } else if (!isEqual(prevUserLayer?.options, userLayer.options)) {
                existingEsvLayer.onUpdate({ data: cloneDeep((userLayer.options as any).data) });
                if (userLayer.options.order !== undefined) {
                    existingEsvLayer.order = userLayer.options.order + 1;
                }
                interactionHandler.removeLayer(userLayer.id);
                if (userLayer.hoverable) {
                    interactionHandler.addLayer(existingEsvLayer);
                }
            } else if (prevUserLayer?.hoverable !== userLayer.hoverable) {
                // Options unchanged but hoverable toggled - re-register independently.
                interactionHandler.removeLayer(userLayer.id);
                if (userLayer.hoverable) {
                    interactionHandler.addLayer(existingEsvLayer);
                }
            }

            this._userLayerMap.set(userLayer.id, cloneDeep(userLayer));
        }

        this.ensurePixiCanvasInDom();
        this.applyResize();
    }

    private resizeLayerElement(layer: Layer<unknown>) {
        if (!this._containerSize) return;
        const { width, height } = this._containerSize;
        layer.element?.setAttribute("width", width.toString());
        layer.element?.setAttribute("height", height.toString());
    }

    private applyViewport(): void {
        if (!this._esvController || !this._viewport) return;
        if (!isValidViewport(this._viewport)) return;
        if (areViewportsEqual(this._viewport, this._canvasViewport)) return;

        this._programmaticViewportChangeInProgress = true;
        this._canvasViewport = this._viewport;
        this._esvController.setViewport(...this._viewport);

        requestAnimationFrame(() => {
            this._programmaticViewportChangeInProgress = false;
        });
    }

    private applyBounds(): void {
        if (!this._esvController || !this._bounds) return;
        if (!isValidBounds(this._bounds)) return;
        this._esvController.setBounds(this._bounds.x, this._bounds.y);
    }

    private applyZFactor(): void {
        if (!this._esvController) return;
        this._esvController.zoomPanHandler.zFactor = this._zFactor;
        // Zoom limits are expressed in screen-space units, so they must be scaled by zFactor to
        // keep the effective range constant. Without this, a high zFactor (e.g. 10) compresses
        // the allowed zoom so tightly that a full wellbore path hits the 0.1 min-zoom limit.
        this._esvController.zoomPanHandler.setMinZoomLevel(0.1 / this._zFactor);
        this._esvController.zoomPanHandler.setMaxZoomLevel(256 / this._zFactor);
        this._esvController.zoomPanHandler.updateTranslateExtent();
    }

    private applyShowGrid(): void {
        if (!this._esvController) return;
        if (this._showGrid) {
            this._esvController.showLayer("grid");
        } else {
            this._esvController.hideLayer("grid");
        }
    }

    private applyShowAxes(): void {
        if (!this._esvController) return;
        if (this._showAxes) {
            this._esvController.showAxis();
        } else {
            this._esvController.hideAxis();
        }
    }

    private applyShowAxesLabels(): void {
        if (!this._esvController) return;
        if (this._showAxesLabels) {
            this._esvController.showAxisLabels();
        } else {
            this._esvController.hideAxisLabels();
        }
    }

    private applyAxesOptions(): void {
        if (!this._esvController || !this._axesOptions) return;
        if (this._axesOptions.xLabel) {
            this._esvController.axis?.setLabelX(this._axesOptions.xLabel);
        }
        if (this._axesOptions.yLabel) {
            this._esvController.axis?.setLabelY(this._axesOptions.yLabel);
        }
        if (this._axesOptions.unitOfMeasure) {
            this._esvController.axis?.setUnitOfMeasure(this._axesOptions.unitOfMeasure);
        }
    }

    private applyIntersectionReferenceSystem(): void {
        if (!this._esvController || !this._intersectionReferenceSystem) return;
        this._esvController.setReferenceSystem(this._intersectionReferenceSystem);
    }

    private applyHighlightItems(): void {
        if (!this._interactionHandler) return;
        this._interactionHandler.setStaticHighlightItems(this._highlightItems);
    }

    private applyResize(): void {
        if (!this._esvController || !this._containerSize) return;
        const { width, height } = this._containerSize;
        this._resizeInProgress = true;
        this._esvController.adjustToSize(width, height);
        // Read back the effective size after adjustToSize, which may subtract axis space.
        const { width: w, height: h } = this._esvController.currentStateAsEvent;
        if (this._pixiRenderApplication?.renderer) {
            this._pixiRenderApplication.renderer.resize(w, h);
            this._pixiRenderApplication.render();
        }
        // A single resize triggers multiple onRescale callbacks. Defer the flag clear so all of
        // them are suppressed before user-driven events resume.
        requestAnimationFrame(() => {
            this._resizeInProgress = false;
        });
    }
}

function makeEsvLayerInstance(
    userLayer: EsvLayer,
    opts: EsvLayerOptionsMap[EsvLayerType],
    pixiApp: PixiRenderApplication,
): Layer<unknown> {
    switch (userLayer.layerType) {
        case EsvLayerType.CALLOUT_CANVAS:
            return new EsvCalloutCanvasLayer(userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.GEOMODEL_CANVAS:
            return new EsvGeomodelCanvasLayer(userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.GEOMODEL_LABELS:
            return new EsvGeomodelLabelsLayer(userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.GEOMODEL_V2:
            return new EsvGeomodelLayerV2(pixiApp, userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.POLYLINE_INTERSECTION:
            return new EsvPolylineIntersectionLayer(pixiApp, userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.IMAGE_CANVAS:
            return new EsvImageLayer(userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.REFERENCE_LINE:
            return new EsvReferenceLineLayer(userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.SCHEMATIC:
            return new EsvSchematicLayer(pixiApp, userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.SEISMIC:
            return new EsvSeismicLayer(userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.SEISMIC_CANVAS:
            return new EsvSeismicCanvasLayer(userLayer.id, opts as any) as unknown as Layer<unknown>;
        case EsvLayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS:
            return new EsvSurfaceStatisticalFanchartsCanvasLayer(
                userLayer.id,
                opts as any,
            ) as unknown as Layer<unknown>;
        case EsvLayerType.WELLBORE_PATH:
            return new EsvWellborepathLayer(userLayer.id, opts as any) as unknown as Layer<unknown>;
        default:
            throw new Error(`Unsupported layer type: ${(userLayer as EsvLayer).layerType}`);
    }
}

const EPSILON = 0.001;
function areViewportsEqual(v1: Viewport | null, v2: Viewport | null): boolean {
    if (v1 === v2) return true;
    if (v1 === null || v2 === null) return false;
    return (
        fuzzyCompare(v1[0], v2[0], EPSILON) &&
        fuzzyCompare(v1[1], v2[1], EPSILON) &&
        fuzzyCompare(v1[2], v2[2], EPSILON)
    );
}
