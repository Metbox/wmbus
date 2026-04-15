// Side-effect import of every built-in driver. Importing this module
// registers all bundled drivers with the global registry.
//
// Phase 5 lands Multical21 as the first driver to validate the interpreter;
// Phase 6 will expand this list to cover the full 91-driver catalogue.

import "./multical21.js";
