from primary.routers.surface.surface_address import RealizationSurfaceAddress
from primary.routers.surface.surface_address import ObservedSurfaceAddress
from primary.routers.surface.surface_address import StatisticalSurfaceAddress
from primary.routers.surface.surface_address import PartialSurfaceAddress
from primary.routers.surface.surface_address import decode_surf_addr_str


def test_enc_dec_realization_address_no_time() -> None:
    addr0 = RealizationSurfaceAddress("UUID123", "iter-0", "surf.name", "my attr name", -1, None)
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = RealizationSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_realization_address_with_time() -> None:
    addr0 = RealizationSurfaceAddress("UUID123", "iter-0", "surf.name", "my attr name", -1, "2024-01-31T00:00:00Z")
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = RealizationSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_observed_address() -> None:
    addr0 = ObservedSurfaceAddress("UUID123", "surf.name", "my attr name", "2024-01-31T00:00:00Z")
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = ObservedSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_statistical_address_with_real_no_time() -> None:
    addr0 = StatisticalSurfaceAddress("UUID123", "iter-0", "surf.name", "my attr name", "MEAN", [1, 2, 3, 5], None)
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = StatisticalSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_statistical_address_with_real_with_time() -> None:
    addr0 = StatisticalSurfaceAddress(
        "UUID123", "iter-0", "surf.name", "my attr name", "MEAN", [1, 2, 3, 5], "2024-01-31T00:00:00Z"
    )
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = StatisticalSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_statistical_address_with_empty_real_no_time() -> None:
    addr0 = StatisticalSurfaceAddress("UUID123", "iter-0", "surf.name", "my attr name", "MEAN", [], None)
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = StatisticalSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_statistical_address_with_wildcard_real_no_time() -> None:
    addr0 = StatisticalSurfaceAddress("UUID123", "iter-0", "surf.name", "my attr name", "MEAN", None, None)
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = StatisticalSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_statistical_address_with_wildcard_real_with_time() -> None:
    addr0 = StatisticalSurfaceAddress(
        "UUID123", "iter-0", "surf.name", "my attr name", "MEAN", None, "2024-01-31T00:00:00Z"
    )
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = StatisticalSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_partial_address_no_time() -> None:
    addr0 = PartialSurfaceAddress("UUID123", "iter-0", "surf.name", "my attr name", None)
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = PartialSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_enc_dec_partial_address_with_time() -> None:
    addr0 = PartialSurfaceAddress("UUID123", "iter-0", "surf.name", "my attr name", "2024-01-31T00:00:00Z")
    addr_str = addr0.to_addr_str()
    print(f"\n{addr_str=}")
    addr1 = PartialSurfaceAddress.from_addr_str(addr_str)
    assert addr0 == addr1


def test_decode_surf_addr_str() -> None:
    real_addr = decode_surf_addr_str("REAL~~UUID123~~iter-0~~surf.name~~my attr name~~-1")
    assert real_addr.address_type == "REAL"

    obs_addr = decode_surf_addr_str("OBS~~UUID123~~surf.name~~my attr name~~2024-01-31T00:00:00Z")
    assert obs_addr.address_type == "OBS"

    stat_addr = decode_surf_addr_str("STAT~~UUID123~~iter-0~~surf.name~~my attr name~~MEAN~~1-3!5")
    assert stat_addr.address_type == "STAT"

    partial_addr = decode_surf_addr_str("PARTIAL~~UUID123~~iter-0~~surf.name~~my attr name")
    assert partial_addr.address_type == "PARTIAL"
