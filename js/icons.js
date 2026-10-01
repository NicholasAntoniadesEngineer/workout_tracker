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
  // Learn categories.
  people:"<circle cx='9' cy='8.5' r='3'/><path d='M3.5 19 a5.5 5.5 0 0 1 11 0'/>"+
    "<circle class='acc' cx='16.5' cy='9.5' r='2.4'/><path class='acc' d='M15.5 14.2 a4.6 4.6 0 0 1 5 4.8'/>",
  dumbbell:"<path d='M3.5 10 V14 M6.5 7.5 V16.5 M17.5 7.5 V16.5 M20.5 10 V14'/><path class='acc' d='M6.5 12 H17.5'/>",
  target:"<circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='4.2'/><circle class='accf' cx='12' cy='12' r='1.6'/>",
  joint:"<path d='M7 4 L10.5 11.5 M13.5 12.5 L17 20'/><circle class='acc' cx='12' cy='12' r='2.6'/>"+
    "<path d='M5.5 4 H8.5 M15.5 20 H18.5'/>",
  pill:"<rect x='4' y='9' width='16' height='6.4' rx='3.2' transform='rotate(-35 12 12.2)'/>"+
    "<path class='acc' d='M10.2 8.6 L13.9 15.8'/>",
  bolt:"<path class='acc' d='M13 3.5 L6.5 13 H11.5 L10.5 20.5 L17.5 10.5 H12.5 Z'/>",
  drop:"<path d='M12 4 C9 8 6.5 11 6.5 14 a5.5 5.5 0 0 0 11 0 C17.5 11 15 8 12 4 Z'/><path class='acc' d='M9.6 14.6 a2.6 2.6 0 0 0 2.4 2.4'/>",
  moon:"<path d='M18.5 14.5 A7 7 0 1 1 9.5 5.5 A5.6 5.6 0 0 0 18.5 14.5 Z'/><circle class='accf' cx='17.5' cy='6.5' r='1.2'/>",
  search:"<circle cx='10.5' cy='10.5' r='6'/><path class='acc' d='M15 15 L20 20'/>",
  book:"<path d='M12 6.5 C10 5 7.5 4.6 4.5 5 V18 C7.5 17.6 10 18 12 19.5 C14 18 16.5 17.6 19.5 18 V5 C16.5 4.6 14 5 12 6.5 Z'/>"+
    "<path class='acc' d='M12 6.5 V19.5'/>",
  chat:"<path d='M5 6.5 a1.5 1.5 0 0 1 1.5 -1.5 h11 a1.5 1.5 0 0 1 1.5 1.5 v8 a1.5 1.5 0 0 1 -1.5 1.5 h-7 l-4 3.5 v-3.5 a1.5 1.5 0 0 1 -1.5 -1.5 z'/>"+
    "<path class='acc' d='M9 10.5 H15'/>",
  bookmark:"<path d='M7 4.5 h10 a1 1 0 0 1 1 1 V19.5 L12 15.6 L6 19.5 V5.5 a1 1 0 0 1 1 -1 z'/>"+
    "<path class='acc' d='M10 9.5 H14'/>",
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
