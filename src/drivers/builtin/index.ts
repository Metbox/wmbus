// Side-effect import of every built-in driver. Importing this module
// registers all bundled drivers with the global registry.
//
// Phase 5 landed Multical21 as the first driver to validate the interpreter.
// Phase 6 Wave A adds the top-volume drivers Metbox sees in production.

// Phase 5
import "./multical21.js";

// Phase 6 — Wave A
import "./elster.js";
import "./iperl.js";
import "./maddalena.js";
import "./op041a.js";
import "./qheat.js";
import "./supercom587.js";
