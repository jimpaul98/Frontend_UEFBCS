import { createRequire } from 'module';const require = createRequire(import.meta.url);
import {
  MAT_SELECT_CONFIG,
  MAT_SELECT_SCROLL_STRATEGY,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
  MAT_SELECT_TRIGGER,
  MatSelect,
  MatSelectChange,
  MatSelectModule,
  MatSelectTrigger
} from "./chunk-OW33RAIY.js";
import "./chunk-4IFMB2ZQ.js";
import "./chunk-46Q7GKEJ.js";
import "./chunk-FCH27LRP.js";
import {
  MatOptgroup,
  MatOption
} from "./chunk-HYOEAUNO.js";
import "./chunk-C6PPLJDB.js";
import "./chunk-4LHEQOVH.js";
import "./chunk-OXGI6GJO.js";
import "./chunk-POIKKKMR.js";
import "./chunk-IPG5ENZ5.js";
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatPrefix,
  MatSuffix
} from "./chunk-CLUKBMF7.js";
import "./chunk-IBJIYPY3.js";
import "./chunk-5XYFHA5V.js";
import "./chunk-YINUGGCM.js";
import "./chunk-QJVLQKZV.js";
import "./chunk-GQ3DKMPS.js";
import "./chunk-NQMOQYZ4.js";
import "./chunk-HPIVSCDD.js";
import "./chunk-QAGZQHUI.js";
import "./chunk-P5JTHM23.js";
import "./chunk-U2KH76BG.js";
import "./chunk-4NRDWZRV.js";
import "./chunk-WRULZO5C.js";
import "./chunk-PZ2KND7O.js";
import "./chunk-DWTAAPGZ.js";
import "./chunk-DAQKJJRP.js";
import "./chunk-ZVWDWOQO.js";
import "./chunk-WV253EFK.js";
import {
  require_operators
} from "./chunk-2UVUUPPC.js";
import {
  require_cjs
} from "./chunk-C27DBZK2.js";
import "./chunk-K54IFBYX.js";
import {
  __toESM
} from "./chunk-6DU2HRTW.js";

// node_modules/@angular/material/fesm2022/select.mjs
var import_rxjs = __toESM(require_cjs(), 1);
var import_operators = __toESM(require_operators(), 1);
var matSelectAnimations = {
  // Represents
  // trigger('transformPanel', [
  //   state(
  //     'void',
  //     style({
  //       opacity: 0,
  //       transform: 'scale(1, 0.8)',
  //     }),
  //   ),
  //   transition(
  //     'void => showing',
  //     animate(
  //       '120ms cubic-bezier(0, 0, 0.2, 1)',
  //       style({
  //         opacity: 1,
  //         transform: 'scale(1, 1)',
  //       }),
  //     ),
  //   ),
  //   transition('* => void', animate('100ms linear', style({opacity: 0}))),
  // ])
  /** This animation transforms the select's overlay panel on and off the page. */
  transformPanel: {
    type: 7,
    name: "transformPanel",
    definitions: [
      {
        type: 0,
        name: "void",
        styles: {
          type: 6,
          styles: { opacity: 0, transform: "scale(1, 0.8)" },
          offset: null
        }
      },
      {
        type: 1,
        expr: "void => showing",
        animation: {
          type: 4,
          styles: {
            type: 6,
            styles: { opacity: 1, transform: "scale(1, 1)" },
            offset: null
          },
          timings: "120ms cubic-bezier(0, 0, 0.2, 1)"
        },
        options: null
      },
      {
        type: 1,
        expr: "* => void",
        animation: {
          type: 4,
          styles: { type: 6, styles: { opacity: 0 }, offset: null },
          timings: "100ms linear"
        },
        options: null
      }
    ],
    options: {}
  }
};
export {
  MAT_SELECT_CONFIG,
  MAT_SELECT_SCROLL_STRATEGY,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
  MAT_SELECT_TRIGGER,
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatOptgroup,
  MatOption,
  MatPrefix,
  MatSelect,
  MatSelectChange,
  MatSelectModule,
  MatSelectTrigger,
  MatSuffix,
  matSelectAnimations
};
//# sourceMappingURL=@angular_material_select.js.map
