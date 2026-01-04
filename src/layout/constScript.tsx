import { PreloadRules } from "../types.d";
import { CONST_SCRIPT_VERSION } from "../utils/constScriptGen";

export const ConstScriptPreload: PreloadRules[] = [
  {type: "script", href: `/js/consts.js?v=${CONST_SCRIPT_VERSION}`}, 
];

export function ConstScript() {
  return (
    <>
      <script type="text/javascript" src={`/js/consts.js?v=${CONST_SCRIPT_VERSION}`}></script>
    </>
  );
}