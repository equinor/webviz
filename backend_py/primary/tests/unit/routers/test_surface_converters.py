import pytest
from pydantic import TypeAdapter, ValidationError

from webviz_services.sumo_access.surface_types import StdResAttribute, SurfaceStandardResult, TagNameAttribute

from primary.routers.surface import converters, schemas

_surface_attribute_adapter: TypeAdapter[schemas.SurfaceAttribute] = TypeAdapter(schemas.SurfaceAttribute)


def test_to_api_surface_attribute_converts_tag_name_attribute() -> None:
    result = converters.to_api_surface_attribute(TagNameAttribute(tag_name="ds_extract_geogrid"))

    assert result == schemas.TagNameAttribute(kind="TAGNAME", tag_name="ds_extract_geogrid")


def test_to_api_surface_attribute_converts_std_res_attribute_with_sub_name() -> None:
    result = converters.to_api_surface_attribute(
        StdResAttribute(std_res_name=SurfaceStandardResult.FLUID_CONTACT_SURFACE, sub_name="goc")
    )

    assert result == schemas.StdResAttribute(
        kind="STDRES", std_res_name=schemas.SurfaceStandardResult.FLUID_CONTACT_SURFACE, sub_name="goc"
    )


def test_from_api_surface_attribute_converts_tag_name_attribute() -> None:
    result = converters.from_api_surface_attribute(schemas.TagNameAttribute(kind="TAGNAME", tag_name="depth"))

    assert result == TagNameAttribute(tag_name="depth")


def test_from_api_surface_attribute_converts_std_res_attribute_with_omitted_sub_name() -> None:
    result = converters.from_api_surface_attribute(
        schemas.StdResAttribute(kind="STDRES", std_res_name=schemas.SurfaceStandardResult.STRUCTURE_DEPTH_SURFACE)
    )

    assert result == StdResAttribute(std_res_name=SurfaceStandardResult.STRUCTURE_DEPTH_SURFACE, sub_name=None)


def test_surface_attribute_round_trips_through_api_and_service_types() -> None:
    service_attribute = StdResAttribute(std_res_name=SurfaceStandardResult.FLUID_CONTACT_SURFACE, sub_name="owc")

    api_attribute = converters.to_api_surface_attribute(service_attribute)

    assert converters.from_api_surface_attribute(api_attribute) == service_attribute


def test_surface_attribute_discriminator_rejects_missing_kind() -> None:
    with pytest.raises(ValidationError):
        _surface_attribute_adapter.validate_python({"tag_name": "depth"})


def test_surface_attribute_discriminator_rejects_unknown_kind() -> None:
    with pytest.raises(ValidationError):
        _surface_attribute_adapter.validate_python({"kind": "BOGUS", "tag_name": "depth"})
