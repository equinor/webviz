import React from "react";

import { SeismicFencePolyline_api } from "@api";
import { ModuleFCProps } from "@framework/Module";

import { useSeismicFenceDataQuery } from "./queryHooks";
import { State } from "./state";

export const view = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    const seismicAddress = moduleContext.useStoreValue("seismicAddress");

    const polyline: SeismicFencePolyline_api = { x_points: [], y_points: [] };

    const seismicFenceDataQuery = useSeismicFenceDataQuery(
        seismicAddress?.caseUuid ?? null,
        seismicAddress?.ensemble ?? null,
        seismicAddress?.realizationNumber ?? null,
        seismicAddress?.attribute ?? null,
        seismicAddress?.timeString ?? null,
        seismicAddress?.observed ?? null,
        polyline,
        true
    );
    return <></>;
};
