// Feedback goes to the developer through FormSubmit — a free form-to-email relay, so the
// app keeps no backend of its own. The very first submission triggers a one-time activation
// email to confirm the address; after that every note is forwarded. If the network is down
// the caller falls back to a pre-filled mailto. Only what the user typed is sent.
const FEEDBACK_EMAIL="nicholasantoniades@icloud.com";
const ENDPOINT="https://formsubmit.co/ajax/"+encodeURIComponent(FEEDBACK_EMAIL);
const APP_VERSION="1.0";

// A little context so a bug report is actionable — never workout or body data.
export function feedbackContext(view){
  return {screen:view||"home",version:APP_VERSION,
    device:(navigator.userAgent||"").slice(0,180),when:new Date().toISOString()};
}

export function sendFeedback(kind,message,email,ctx){
  const payload={
    _subject:"KingsKiln feedback — "+kind,
    _template:"table",
    _captcha:"false",
    // FormSubmit activates per site address; the live app always runs on www, so name it.
    _url:"https://www.kingskiln.com/",
    Type:kind,
    Message:message,
    Screen:ctx.screen,
    Version:ctx.version,
    Device:ctx.device,
    When:ctx.when
  };
  if(email){payload._replyto=email;payload.From=email;}
  return fetch(ENDPOINT,{method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json"},
    body:JSON.stringify(payload)})
    .then(r=>r.json().catch(()=>({})).then(j=>{
      // Only a genuine success shows "thank you"; a needs-activation or error response
      // (the address not yet confirmed, or FormSubmit refusing) falls back to email.
      if(r.ok&&(j.success===true||j.success==="true"))return j;
      throw new Error((j&&j.message)||("HTTP "+r.status));
    }));
}

// The offline / blocked fallback: open the user's mail app, pre-filled to the developer.
export function feedbackMailto(kind,message,email){
  const subject="KingsKiln feedback — "+kind;
  const body=message+"\n\n— reply to: "+(email||"n/a");
  return "mailto:"+FEEDBACK_EMAIL+"?subject="+encodeURIComponent(subject)+
    "&body="+encodeURIComponent(body);
}
