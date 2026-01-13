"""
Internal type mappings and constants for flow network nodes.

This module contains the mapping dictionaries between internal enum types
and their string representations or Eclipse summary vector names.
"""

from webviz_services.flow_network_assembler.flow_network_types import DataType, NodeType, TreeType


NODE_TYPE_ENUM_TO_STRING_MAPPING = {
    NodeType.INJ: "Injector",
    NodeType.PROD: "Producer",
    NodeType.OTHER: "Other",
}


FIELD_DATATYPE_VECTOR_MAP = {
    DataType.OILRATE: "FOPR",
    DataType.GASRATE: "FGPR",
    DataType.WATERRATE: "FWPR",
    DataType.WATERINJRATE: "FWIR",
    DataType.GASINJRATE: "FGIR",
    DataType.PRESSURE: "GPR",
}

TREETYPE_DATATYPE_VECTORS_MAP = {
    TreeType.GRUPTREE: {
        DataType.OILRATE: "GOPR",
        DataType.GASRATE: "GGPR",
        DataType.WATERRATE: "GWPR",
        DataType.WATERINJRATE: "GWIR",
        DataType.GASINJRATE: "GGIR",
        DataType.PRESSURE: "GPR",
    },
    # BRANPROP can not be used for injection, but the nodes
    # might also be GNETINJE and could therefore have injection.
    TreeType.BRANPROP: {
        DataType.OILRATE: "GOPRNB",
        DataType.GASRATE: "GGPRNB",
        DataType.WATERRATE: "GWPRNB",
        DataType.WATERINJRATE: "GWIR",
        DataType.GASINJRATE: "GGIR",
        DataType.PRESSURE: "GPR",
    },
}

WELL_DATATYPE_VECTOR_MAP = {
    DataType.WELL_STATUS: "WSTAT",
    DataType.OILRATE: "WOPR",
    DataType.GASRATE: "WGPR",
    DataType.WATERRATE: "WWPR",
    DataType.WATERINJRATE: "WWIR",
    DataType.GASINJRATE: "WGIR",
    DataType.PRESSURE: "WTHP",
    DataType.BHP: "WBHP",
    DataType.WMCTL: "WMCTL",
}

DATATYPE_LABEL_MAP = {
    DataType.OILRATE: "Oil Rate",
    DataType.GASRATE: "Gas Rate",
    DataType.WATERRATE: "Water Rate",
    DataType.WATERINJRATE: "Water Inj Rate",
    DataType.GASINJRATE: "Gas Inj Rate",
    DataType.PRESSURE: "Pressure",
    DataType.BHP: "BHP",
    DataType.WMCTL: "WMCTL",
}
