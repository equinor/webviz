import { KeyKind } from "@framework/DataChannelTypes";
import { SyncSettingKey } from "@framework/SyncSettings";
import type { Template } from "@framework/TemplateRegistry";
import { TemplateRegistry } from "@framework/TemplateRegistry";
import { ChannelIds as InplaceChannelIds } from "@modules/InplaceVolumesPlot/channelDefs";
import { ChannelIds as TimeSeriesChannelIds } from "@modules/SimulationTimeSeries/channelDefs";

const template: Template = {
    name: "Correlation matrix between input parameters and multiple responses",
    description:
        "Example template for a correlation matrix between input parameters and various responses. " +
        "Either a full matrix or a parameter vs. response matrix can be shown. ",
    moduleInstances: [
        {
            instanceRef: "MainSimulationTimeSeriesInstance",
            moduleName: "SimulationTimeSeries",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            /*
            initialSettings: {
                selectedVectorTags: ["FOPT", "FGPT", "FOPR", "FGPR"],
                visualizationMode: VisualizationMode.INDIVIDUAL_REALIZATIONS,
            },
            */
        },
        {
            instanceRef: "MainInplaceVolumesPlotInstance",
            moduleName: "InplaceVolumesPlot",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.INPLACE_VOLUMES_FILTER],
            /*
            initialSettings: {
                selectedIndexValueCriteria: IndexValueCriteria.ALLOW_INTERSECTION,
            },
            */
        },
        {
            instanceRef: "MyParameterResponseCorrelationMatrixPlotInstance",
            moduleName: "ParameterResponseCorrelationMatrixPlot",
            layout: {
                relHeight: 0.5,
                relWidth: 1,
                relX: 0,
                relY: 0.5,
            },

            dataChannelsToInitialSettingsMapping: {
                channelResponse: {
                    listensToInstanceRef: "MainSimulationTimeSeriesInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: TimeSeriesChannelIds.TIME_SERIES,
                },
                channelResponse2: {
                    listensToInstanceRef: "MainInplaceVolumesPlotInstance",
                    kindOfKey: KeyKind.REALIZATION,
                    channelIdString: InplaceChannelIds.RESPONSE_PER_REAL,
                },
            },
            /*
            initialSettings: {
                parameterIdents: [
                    new ParameterIdent("KVKH_CHANNEL", "GLOBVAR"),
                    new ParameterIdent("KVKH_CREVASSE", "GLOBVAR"),
                    new ParameterIdent("KVKH_US", "GLOBVAR"),
                    new ParameterIdent("KVKH_LS", "GLOBVAR"),
                    new ParameterIdent("FWL_CENTRAL", "GLOBVAR"),
                    new ParameterIdent("FWL_NORTH_HORST", "GLOBVAR"),
                    new ParameterIdent("GOC_NORTH_HORST", "GLOBVAR"),
                    new ParameterIdent("RELPERM_INT_WO", "GLOBVAR"),
                    new ParameterIdent("RELPERM_INT_GO", "GLOBVAR"),
                    new ParameterIdent("ISOTREND_ALT1W_VALYSAR", "GLOBVAR"),
                    new ParameterIdent("ISOTREND_ALT1W_THERYS", "GLOBVAR"),
                    new ParameterIdent("ISOTREND_ALT1W_VOLON", "GLOBVAR"),
                ],
                showLabels: true,
                correlationSettings: {
                    hideIndividualCells: true,
                    filterColumns: true,
                    filterRows: true,
                    threshold: 0.1,
                },
            },
            */
        },
    ],
};

TemplateRegistry.registerTemplate(template);
