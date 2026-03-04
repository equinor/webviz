import pyarrow as pa
from typing import Dict, Any


def create_fip_mapping_table() -> pa.Table:
    """
    Creates a PyArrow table from a configuration dictionary by
    intersecting FIPNUM lists from REGION and ZONE groups.
    """
    config = {
        "FIPNUM": {
            "groups": {
                "REGION": {
                    "WestLowland": [1, 8, 15],
                    "CentralSouth": [2, 9, 16],
                    "CentralNorth": [3, 10, 17],
                    "NorthHorst": [4, 11, 18],
                    "CentralRamp": [5, 12, 19],
                    "CentralHorst": [6, 13, 20],
                    "EastLowland": [7, 14, 21],
                },
                "ZONE": {
                    "Valysar": [1, 2, 3, 4, 5, 6, 7],
                    "Therys": [8, 9, 10, 11, 12, 13, 14],
                    "Volon": [15, 16, 17, 18, 19, 20, 21],
                },
            }
        }
    }

    # Extract the nested group definitions
    groups = config.get("FIPNUM", {}).get("groups", {})
    region_defs = groups.get("REGION", {})
    zone_defs = groups.get("ZONE", {})

    rows = []

    # Iterate through every Zone and Region combination defined in config
    for zone_name, zone_fips in zone_defs.items():
        for region_name, region_fips in region_defs.items():

            # Find the FIPNUM that exists in BOTH the zone list and region list
            # We use set intersection to find the common ID
            intersection = set(zone_fips).intersection(set(region_fips))

            if intersection:
                # Assuming 1:1 mapping (one FIPNUM per unique Zone/Region pair)
                fip_val = list(intersection)[0]
                rows.append({"FIPNUM": int(fip_val), "ZONE": str(zone_name), "REGION": str(region_name)})
            else:
                # If you want to maintain a "Full Matrix" for the frontend
                # even for empty intersections, you could add a row with FIPNUM: 0
                pass

    # Sort the list by FIPNUM for consistent output
    rows.sort(key=lambda x: x["FIPNUM"])

    # Convert the list of dicts to a PyArrow Table
    return pa.Table.from_pylist(rows)
