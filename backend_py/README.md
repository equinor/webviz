# Internal packages
The backend project is organized into different sub-packages.

* `primary` - The main backend application. This package contains the FastAPI-based API layer, including:
    * Route definitions (HTTP endpoints)
    * Middleware and configuration
    * Integration with the service layer
    * Serves as the entry point for the backend.

* `libs/core_utils` - General-purpose utilities shared across all packages
    * Contains lightweight helper functionality
    * Has minimal external dependencies
    * Does not depend on framework or service-layer code

* `libs/server_schemas` - Pydantic models defining the contracts between backend services
    * Request/response models
    * Shared DTOs
    * These models define the structured data exchanged across services

* `libs/services` - The service (application) layer implementing business logic, responsible for:
    * Accessing data from Equinor services
    * Assembling and transforming data
    * Isolating business logic from the API layer
    * Designed to be reusable across different environments (e.g., FastAPI app, workers)

* `user_grid3d_ri` - Supports 3D grid operations in a user session
    * Stateful, per-user service, utilizing ResInsight for 3D grid operations
    * Launched on demand, on a per-user basis, and shut down automatically if inactive
    * Acts as a bridge between backend services and ResInsight

* `user_mock` - A mock/template implementation of a user session. Currently not in active use, but serves as:
    * A reference implementation
    * A development/testing scaffold

**Dependency direction**:  
`primary` -> `services` -> `server_schemas` -> `core_utils`


## Development tooling
Core development dependencies such as linting and testing are defined in the top-level `pyproject.toml` file. 

Installation of the shared repo tooling should be done by running:
`poetry install` in the `backend_py/` folder

Similarly, execution of mypy and pylint should be done from the backend_py folder.
Two convenience scrips have been added to the `backend_py/scripts` folder:

* `mypy-all.sh` - runs mypy on all the packages in libs + primary
* `pylint-all.sh` - runs pylint on all the packages in libs + primary
 