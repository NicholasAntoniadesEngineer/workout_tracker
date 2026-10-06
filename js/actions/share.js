// Sharing and feedback: the one share button and its menu, the workout summary's share, and
// the feedback window (typing isn't re-rendered, so fields are read from the DOM on send).
// Each handler returns true once it has dealt with the tap.
import {findRoutine,getSession,state} from "../store.js";
import {workoutText} from "../exporters.js";
import {notice} from "../dialog.js";
import {shareApp,shareDay,shareRoutine} from "../share.js";
import {feedbackContext,feedbackMailto,sendFeedback} from "../feedback.js";

export function handle(t,ctx){
  // One share button everywhere: it opens a menu of what this context can share.
  if(t.id==="sharebtn"){state.shareMenu={type:"day"};ctx.render();return true;}
  const shRoutine=t.closest&&t.closest("[data-shareroutine]");
  if(shRoutine){
    state.shareMenu={type:"routine",id:shRoutine.getAttribute("data-shareroutine")};
    ctx.render();return true;
  }
  if(t.id==="shareapp"){shareApp();return true;}
  // Feedback window. Typing isn't re-rendered, so read the fields from the DOM when needed.
  if(t.id==="feedbackbtn"){state.feedback={kind:"idea",msg:"",email:""};ctx.render();return true;}
  if(t.id==="feedbackclose"||t.id==="feedbackback"){state.feedback=null;ctx.render();return true;}
  const captureFb=()=>{
    const m=document.getElementById("fbmsg"),e=document.getElementById("fbemail");
    if(m)state.feedback.msg=m.value;
    if(e)state.feedback.email=e.value;
  };
  const fbKind=t.closest&&t.closest("[data-fbkind]");
  if(fbKind&&state.feedback){
    captureFb();state.feedback.kind=fbKind.getAttribute("data-fbkind");ctx.render();return true;
  }
  if((t.id==="fbsend"||t.id==="fbretry")&&state.feedback){
    if(t.id==="fbsend")captureFb();
    const f=state.feedback;
    if(!(f.msg||"").trim()){const m=document.getElementById("fbmsg");if(m)m.focus();return true;}
    f.sending=true;f.error=false;ctx.render();
    sendFeedback(f.kind,f.msg.trim(),(f.email||"").trim(),feedbackContext(state.view))
      .then(()=>{if(state.feedback){state.feedback.sending=false;state.feedback.sent=true;ctx.render();}})
      .catch(err=>{if(state.feedback){state.feedback.sending=false;state.feedback.error=true;
        state.feedback.errMsg=(err&&err.message)||"";ctx.render();}});
    return true;
  }
  if(t.id==="fbmailto"&&state.feedback){
    const f=state.feedback;
    window.location.href=feedbackMailto(f.kind,(f.msg||"").trim(),(f.email||"").trim());
    return true;
  }
  const shareOpt=t.closest&&t.closest("[data-shareopt]");
  if(shareOpt){
    const kind=shareOpt.getAttribute("data-shareopt");
    const m=state.shareMenu||{};
    state.shareMenu=null;
    if(kind==="app")shareApp();
    else if(m.type==="routine"){
      const r=findRoutine(m.id);
      if(r)shareRoutine(r.name,r.ex);
    }else{
      const s=getSession();
      if(kind==="image")shareDay(s);
      else if(kind==="text"){
        // The day as plain text on the clipboard; shown to copy by hand where the clipboard is refused.
        const txt=workoutText(s,state.settings.unit||"kg");
        const byHand=()=>{state.dialog={kind:"notice",title:"Copy this workout",copy:txt,ok:"Done"};ctx.render();};
        try{navigator.clipboard.writeText(txt).then(()=>{notice("Copied","The workout is on your clipboard as text.");ctx.render();},byHand);}catch(e){byHand();}
      }
      else shareRoutine(s.title,s.ex.map(e=>e.name));
    }
    ctx.render();return true;
  }
  if(t.id==="sharemenuclose"||t.id==="sharemenuback"){state.shareMenu=null;ctx.render();return true;}
  if(t.id==="summaryclose"||t.id==="summaryback"){state.summary=null;ctx.render();return true;}
  if(t.closest&&t.closest("#summaryshare")){
    const s=state.sessions.find(x=>x.id===state.summary);
    if(s)shareDay(s);
    return true;
  }
  return false;
}
