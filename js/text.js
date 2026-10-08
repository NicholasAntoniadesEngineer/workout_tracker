// Text as typed on a plain keyboard: accents dropped, and the letters that have no plain form
// spelled out, so a name typed on any keyboard finds it ("Hafthor" finds Hafþór, "Jorgen" finds
// Jørgen, "Kirkpinar" finds Kırkpınar, "5x5" finds 5×5).
const SPELL={"ı":"i","İ":"i","þ":"th","Þ":"th","ø":"o","Ø":"o","æ":"ae","Æ":"ae","œ":"oe","Œ":"oe","ß":"ss","ł":"l","Ł":"l","đ":"d","Đ":"d","ð":"d","Ð":"d","×":"x","’":"'","‘":"'"};
export const plainText=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[ıİþÞøØæÆœŒßłŁđĐðÐ×’‘]/g,c=>SPELL[c]);
export const fold=s=>plainText(s).toLowerCase();
