from fmu.datamodels.fmu_results.enums import FluidContactType
from webviz_services.sumo_access.surface_types import InitialFluidContactSurfaceMeta

from primary.routers.surface import converters, schemas


def test_to_api_initial_fluid_contact_surface_meta_keeps_same_name_contacts_distinct() -> None:
    result = converters.to_api_initial_fluid_contact_surface_meta(
        [
            InitialFluidContactSurfaceMeta(
                name="VOLANTIS GP. Top",
                contact=FluidContactType.fwl,
                is_stratigraphic=True,
                global_min_val=1700.0,
                global_max_val=1700.0,
            ),
            InitialFluidContactSurfaceMeta(
                name="VOLANTIS GP. Top",
                contact=FluidContactType.goc,
                is_stratigraphic=True,
                global_min_val=1600.0,
                global_max_val=1600.0,
            ),
        ]
    )

    assert [item.model_dump() for item in result] == [
        {
            "name": "VOLANTIS GP. Top",
            "contact": schemas.InitialFluidContactType.FWL,
            "name_is_stratigraphic_offical": True,
            "value_min": 1700.0,
            "value_max": 1700.0,
        },
        {
            "name": "VOLANTIS GP. Top",
            "contact": schemas.InitialFluidContactType.GOC,
            "name_is_stratigraphic_offical": True,
            "value_min": 1600.0,
            "value_max": 1600.0,
        },
    ]
