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
} from "./chunk-HBTEWJMM.js";
import "./chunk-JPATZIRF.js";
import "./chunk-G4LNENJM.js";
import "./chunk-J2ORUKEW.js";
import {
  MatOptgroup,
  MatOption
} from "./chunk-4CQ3SMGE.js";
import "./chunk-QIYTSDSU.js";
import "./chunk-IVRALJ3Y.js";
import "./chunk-MU7DJQHT.js";
import "./chunk-HPVZOJOX.js";
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatPrefix,
  MatSuffix
} from "./chunk-M5V3VCVX.js";
import "./chunk-7MK3A7NQ.js";
import "./chunk-5XYFHA5V.js";
import "./chunk-E54HIZ46.js";
import "./chunk-QJVLQKZV.js";
import "./chunk-JX5HDXVX.js";
import "./chunk-HXFVV2UZ.js";
import "./chunk-RHZJXN4X.js";
import "./chunk-JWAVXSH6.js";
import "./chunk-4NRDWZRV.js";
import "./chunk-IIXO7YIU.js";
import "./chunk-54NBLQQP.js";
import "./chunk-74WRI6RF.js";
import "./chunk-3MWYMNVP.js";
import "./chunk-ZVWDWOQO.js";
import "./chunk-LJYIMYAW.js";
import {
  require_cjs
} from "./chunk-C27DBZK2.js";
import {
  require_operators
} from "./chunk-2UVUUPPC.js";
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
