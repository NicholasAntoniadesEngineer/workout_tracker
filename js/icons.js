// The app's icons: 24-grid stroke drawings in the shield's language — 2px ink lines,
// round caps, one amber detail each. Inline SVG through currentColor, so they take the
// button's text color and both themes for free. No icon font, no emoji lottery.
const PATHS={
  share:"<path d='M4.5 12.5 v5.5 a2 2 0 0 0 2 2 h11 a2 2 0 0 0 2 -2 v-5.5'/>"+
    "<path class='acc' d='M12 14 V4 M8.3 7.2 L12 3.5 L15.7 7.2'/>",
  save:"<path d='M4.5 12.5 v5.5 a2 2 0 0 0 2 2 h11 a2 2 0 0 0 2 -2 v-5.5'/>"+
    "<path class='acc' d='M12 4 V14 M8.3 10.8 L12 14.5 L15.7 10.8'/>",
  home:"<path d='M4.5 10.8 L12 4.2 L19.5 10.8'/>"+
    "<path d='M6.8 9 V18 a1.6 1.6 0 0 0 1.6 1.6 h7.2 a1.6 1.6 0 0 0 1.6 -1.6 V9'/>"+
    "<path class='acc' d='M12 19.4 V14.6'/>",
  days:"<path d='M5 6.5 H19 M5 12 H19 M5 17.5 H12'/>"+
    "<circle class='accf' cx='17' cy='17.5' r='1.7'/>",
  settings:"<path d='M4.5 8 H19.5 M4.5 16 H19.5'/>"+
    "<circle cx='9.2' cy='8' r='2.4' fill='var(--panel)'/>"+
    "<circle class='acc' cx='14.8' cy='16' r='2.4' fill='var(--panel)'/>",
  calendar:"<rect x='4' y='5.5' width='16' height='14.5' rx='2.6'/>"+
    "<path d='M8.2 3.4 V7 M15.8 3.4 V7 M4 10.5 H20'/>"+
    "<circle class='accf' cx='12' cy='15' r='1.8'/>",
  progress:"<path d='M4.5 17.5 L10 11.8 L13.8 14.8 L19.5 8'/>"+
    "<path class='acc' d='M15.8 7.2 H19.9 V11.3'/>",
  body:"<rect x='4.5' y='4.5' width='15' height='15' rx='3'/>"+
    "<path d='M8.8 10.2 a3.4 3.4 0 0 1 6.4 0'/>"+
    "<path class='acc' d='M12 10 L13.6 7.6'/>",
  back:"<path d='M14.5 5.5 L8 12 L14.5 18.5'/>",
  reset:"<path d='M18.9 13.2 a7 7 0 1 1 -1.8 -6.4'/>"+
    "<path class='acc' d='M19.3 3.4 V7.4 H15.3'/>",
  link:"<path d='M10.2 13.8 a3.5 3.5 0 0 0 5 0 l3.2 -3.2 a3.5 3.5 0 0 0 -5 -5 L11.9 7.1'/>"+
    "<path class='acc' d='M13.8 10.2 a3.5 3.5 0 0 0 -5 0 l-3.2 3.2 a3.5 3.5 0 0 0 5 5 l1.5 -1.5'/>",
  photo:"<rect x='4' y='6' width='16' height='13' rx='2.6'/>"+
    "<path d='M9 6 L10.3 4 H13.7 L15 6'/>"+
    "<circle class='acc' cx='12' cy='12.3' r='3.2'/>",
  shield:"<path d='M12 3.4 L18.6 6 V12 C18.6 16.4 15.6 19.2 12 20.8 C8.4 19.2 5.4 16.4 5.4 12 V6 Z'/>"+
    "<path class='acc' d='M12 8 V14 M9.2 10.4 H14.8'/>",
};

export function icon(name,cls){
  return "<svg class='icn"+(cls?" "+cls:"")+"' viewBox='0 0 24 24' aria-hidden='true'>"+
    (PATHS[name]||"")+"</svg>";
}
