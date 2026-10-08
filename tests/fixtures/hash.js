// The fingerprint of a page's SVG, so the tests know when the drawn sheets are out of date.
import crypto from "node:crypto";
export const svgHash=svg=>crypto.createHash("sha1").update(svg).digest("hex").slice(0,16);
