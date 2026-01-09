import logging
from dataclasses import dataclass

LOGGER = logging.getLogger(__name__)


@dataclass
# Dataclass needs to save a bunch of timestamps. Many attributes is okay here, as splitting it would be more cumbersome
# pylint: disable-next=too-many-instance-attributes
class PerformanceTimes:
    """Simple utility class to store performance timer results for different internal method calls"""

    init_sumo_data: int = 0
    init_summary_vector_list: int = 0
    fetch_grouptree_df: int = 0
    init_grouptree_df_model: int = 0
    create_filtered_dataframe: int = 0
    init_summary_vector_data_table: int = 0
    create_node_classifications: int = 0
    create_network_summary_vectors_info: int = 0

    # Unused for logging for now, but available if needed
    build_and_verify_vectors_of_interest: int = 0
    create_well_node_classifications: int = 0

    def log_sumo_download_times(self) -> None:
        # Log download from Sumo times
        LOGGER.info(
            f"Total time to fetch data from Sumo: {self.init_sumo_data + self.init_summary_vector_data_table}ms, "
            f"Get summary vector list in: {self.init_summary_vector_list}ms, "
            f"Get group tree table in: {self.fetch_grouptree_df}ms, "
            f"Get summary vectors in: {self.init_summary_vector_data_table}ms"
        )

    def log_structure_init_times(self) -> None:
        # Log initialization of data structures times
        LOGGER.info(
            f"Initialize GroupTreeModel in: {self.init_grouptree_df_model}ms, "
            f"Create filtered dataframe in: {self.create_filtered_dataframe}ms, "
            f"Create node classifications in: {self.create_node_classifications}ms, "
            f"Create group tree summary vectors info in: {self.create_network_summary_vectors_info}ms"
        )
