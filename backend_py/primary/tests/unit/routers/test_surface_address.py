import pytest

from webviz_services.sumo_access.surface_types import StdResAttribute, SurfaceStandardResult, TagNameAttribute

from primary.routers.surface.surface_address import RealizationSurfaceAddress
from primary.routers.surface.surface_address import ObservedSurfaceAddress
from primary.routers.surface.surface_address import StatisticalSurfaceAddress
from primary.routers.surface.surface_address import decode_surf_addr_str

TAG_ATTR = TagNameAttribute(tag_name="my attr name")
STDRES_ATTR_WITH_SUB_NAME = StdResAttribute(std_res_name=SurfaceStandardResult.FLUID_CONTACT_SURFACE, sub_name="owc")
STDRES_ATTR_NO_SUB_NAME = StdResAttribute(std_res_name=SurfaceStandardResult.STRUCTURE_DEPTH_SURFACE, sub_name=None)

ALL_ATTRIBUTES = [TAG_ATTR, STDRES_ATTR_WITH_SUB_NAME, STDRES_ATTR_NO_SUB_NAME]


def test_tag_name_may_be_the_placeholder_character() -> None:
    # The placeholder slot is ignored when decoding a tag name attribute
    addr0 = RealizationSurfaceAddress("UUID123", "iter-0", "surf.name", TagNameAttribute(tag_name="-"), 1, None)
    addr1 = RealizationSurfaceAddress.from_addr_str(addr0.to_addr_str())
    assert addr0 == addr1


def test_sub_name_may_not_be_the_placeholder_character() -> None:
    with pytest.raises(ValueError, match="reserved placeholder"):
        RealizationSurfaceAddress(
            "UUID123",
            "iter-0",
            "surf.name",
            StdResAttribute(std_res_name=SurfaceStandardResult.FLUID_CONTACT_SURFACE, sub_name="-"),
            1,
            None,
        )


@pytest.mark.parametrize("attribute", ALL_ATTRIBUTES)
@pytest.mark.parametrize("iso_time_or_interval", [None, "2024-01-31T00:00:00Z"])
def test_enc_dec_realization_address(
    attribute: TagNameAttribute | StdResAttribute, iso_time_or_interval: str | None
) -> None:
    addr0 = RealizationSurfaceAddress("UUID123", "iter-0", "surf.name", attribute, -1, iso_time_or_interval)
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = RealizationSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


@pytest.mark.parametrize("attribute", ALL_ATTRIBUTES)
def test_enc_dec_observed_address(attribute: TagNameAttribute | StdResAttribute) -> None:
    addr0 = ObservedSurfaceAddress("UUID123", "surf.name", attribute, "2024-01-31T00:00:00Z")
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = ObservedSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


@pytest.mark.parametrize("attribute", ALL_ATTRIBUTES)
@pytest.mark.parametrize("stat_realizations", [None, [], [1, 2, 3, 5]])
@pytest.mark.parametrize("iso_time_or_interval", [None, "2024-01-31T00:00:00Z"])
def test_enc_dec_statistical_address(
    attribute: TagNameAttribute | StdResAttribute,
    stat_realizations: list[int] | None,
    iso_time_or_interval: str | None,
) -> None:
    addr0 = StatisticalSurfaceAddress(
        "UUID123", "iter-0", "surf.name", attribute, "MEAN", stat_realizations, iso_time_or_interval
    )
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = StatisticalSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_decode_surf_addr_str() -> None:
    real_addr = decode_surf_addr_str("REAL~~UUID123~~iter-0~~surf.name~~TAGNAME~~my attr name~~-~~-1")
    assert real_addr.address_type == "REAL"
    assert real_addr.attribute == TAG_ATTR

    obs_addr = decode_surf_addr_str("OBS~~UUID123~~surf.name~~TAGNAME~~my attr name~~-~~2024-01-31T00:00:00Z")
    assert obs_addr.address_type == "OBS"

    stat_addr = decode_surf_addr_str("STAT~~UUID123~~iter-0~~surf.name~~TAGNAME~~my attr name~~-~~MEAN~~1-3!5")
    assert stat_addr.address_type == "STAT"

    stdres_addr = decode_surf_addr_str("REAL~~UUID123~~iter-0~~surf.name~~STDRES~~fluid_contact_surface~~owc~~-1")
    assert stdres_addr.attribute == STDRES_ATTR_WITH_SUB_NAME

    stdres_no_sub_addr = decode_surf_addr_str(
        "REAL~~UUID123~~iter-0~~surf.name~~STDRES~~structure_depth_surface~~-~~-1"
    )
    assert stdres_no_sub_addr.attribute == STDRES_ATTR_NO_SUB_NAME


def test_decode_rejects_unknown_attribute_type() -> None:
    with pytest.raises(ValueError, match="Unknown surface attribute type"):
        decode_surf_addr_str("REAL~~UUID123~~iter-0~~surf.name~~BOGUS~~my attr name~~-~~-1")


def test_decode_rejects_unknown_standard_result() -> None:
    with pytest.raises(ValueError):
        decode_surf_addr_str("REAL~~UUID123~~iter-0~~surf.name~~STDRES~~not_a_standard_result~~-~~-1")
