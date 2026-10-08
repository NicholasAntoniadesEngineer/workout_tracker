// Body numbers that follow from the tape: the US Navy body-fat estimate (Hodgdon and Beckett,
// 1984), which is within about 3–4 points of a lab reading when the tape is used well, so it
// is always shown as a range; and blood pressure read against the usual bands.
const log10=x=>Math.log(x)/Math.LN10;
// cm in, percentage out. Men: waist and neck. Women: waist, hip and neck.
export function navyBodyFat(sex,heightCm,waistCm,neckCm,hipCm){
  // The two formulas differ by about 12 points, so with sex not set there's no estimate.
  if(sex!=="m"&&sex!=="f")return null;
  if(!heightCm||!waistCm||!neckCm||(sex==="f"&&!hipCm))return null;
  const i=x=>x/2.54,h=i(heightCm),w=i(waistCm),n=i(neckCm);
  let bf;
  if(sex==="f")bf=163.205*log10(w+i(hipCm)-n)-97.684*log10(h)-78.387;
  else bf=86.010*log10(w-n)-70.041*log10(h)+36.76;
  if(!isFinite(bf)||bf<2||bf>70)return null;
  return Math.round(bf*10)/10;
}
export const bodyFatRange=bf=>bf==null?"":Math.max(2,Math.round(bf-3))+"–"+Math.round(bf+3)+"%";
// Blood pressure, in the bands most charts use; a word, not a verdict.
export function bpBand(sys,dia){
  if(!sys||!dia)return "";
  // The higher band of the two numbers wins; low only when neither is high.
  if(sys>=140||dia>=90)return "high (stage 2)";
  if(sys>=130||dia>=80)return "high (stage 1)";
  if(sys<90||dia<60)return "low";
  return sys>=120?"elevated":"normal";
}
