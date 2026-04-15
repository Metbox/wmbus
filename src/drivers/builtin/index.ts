// Side-effect import of every built-in driver. Importing this module
// registers all bundled drivers with the global registry.
//
// Phase 5 landed Multical21 as the first driver to validate the interpreter.
// Phase 6 Wave A adds the top-volume drivers Metbox sees in production.

// Phase 5
import "./multical21.js";

// Phase 6 — Wave A + B
import "./aquastream.js";
import "./dme173.js";
import "./elf2.js";
import "./elster.js";
import "./eltako.js";
import "./hydrus.js";
import "./iperl.js";
import "./janz.js";
import "./kaden.js";
import "./kamheat.js";
import "./kampress.js";
import "./maddalena.js";
import "./op041a.js";
import "./picoflux.js";
import "./qcaloric.js";
import "./qheat.js";
import "./qheatv2.js";
import "./qwaterv2.js";
import "./sharky775.js";
import "./supercal.js";
import "./supercom587.js";
