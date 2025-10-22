import polars as pl

from ..types import (
    WellProductionData,
    WellInjectionData,
    PRODCOLUMNS,
    INJCOLUMNS,
    INJECTIONTYPE,
)


def calculate_total_production_from_daily(api_results, start_date: str, end_date: str) -> list[WellProductionData]:
    polars_df = pl.DataFrame(api_results)

    # Group per well and sum oil,gas,water volumes
    grouped_df = polars_df.group_by([PRODCOLUMNS.WELL_UUID, PRODCOLUMNS.WB_UUID]).agg(
        [
            pl.col(PRODCOLUMNS.WB_OIL_VOL_SM3).sum().fill_null(0.0),
            pl.col(PRODCOLUMNS.WB_GAS_VOL_SM3).sum().fill_null(0.0),
            pl.col(PRODCOLUMNS.WB_WATER_VOL_M3).sum().fill_null(0.0),
            pl.col(PRODCOLUMNS.WB_UWBI).first(),
        ]
    )

    # Convert to list of WellProductionData
    return [
        WellProductionData(
            wellbore_uuid=row[0],  # WB_UUID
            wellbore_uwbi=row[4],  # WB_UWBI
            start_date=start_date,
            end_date=end_date,
            oil_production_sm3=row[1],  # Oil sum
            gas_production_sm3=row[2],  # Gas sum
            water_production_m3=row[3],  # Water sum
        )
        for row in grouped_df.select(
            [
                PRODCOLUMNS.WB_UUID,
                PRODCOLUMNS.WB_OIL_VOL_SM3,
                PRODCOLUMNS.WB_GAS_VOL_SM3,
                PRODCOLUMNS.WB_WATER_VOL_M3,
                PRODCOLUMNS.WB_UWBI,
            ]
        ).rows()
    ]


def calculate_total_injection_from_daily(api_results, start_date: str, end_date: str) -> list[WellInjectionData]:
    polars_df = pl.DataFrame(api_results)

    # Group per well and sum injection volumes by type
    grouped_df = polars_df.group_by([INJCOLUMNS.WB_UUID]).agg(
        [
            pl.col(INJCOLUMNS.WB_INJ_VOL)
            .filter(pl.col(INJCOLUMNS.INJ_TYPE) == INJECTIONTYPE.WATER)
            .sum()
            .fill_null(0.0)
            .alias("water_injection"),
            pl.col(INJCOLUMNS.WB_INJ_VOL)
            .filter(pl.col(INJCOLUMNS.INJ_TYPE) == INJECTIONTYPE.GAS)
            .sum()
            .fill_null(0.0)
            .alias("gas_injection"),
        ]
    )

    # Convert to list of WellInjectionData
    return [
        WellInjectionData(
            wellbore_uuid=row[0],  # WB_UUID
            start_date=start_date,
            end_date=end_date,
            water_injection=row[1],  # Water injection sum
            gas_injection=row[2],  # Gas injection sum
        )
        for row in grouped_df.rows()
    ]
