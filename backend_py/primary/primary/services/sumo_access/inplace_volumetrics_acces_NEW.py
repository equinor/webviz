

# Allowed categories (index column names) for the volumetric tables
ALLOWED_INDEX_COLUMN_NAMES = ["ZONE", "REGION", "FACIES"]  # , "LICENSE"]

# Index column values to ignore, i.e. remove from the volumetric tables
IGNORED_INDEX_COLUMN_VALUES = ["Totals"]

class InplaceVolumetricsAccess(SumoEnsemble):

    