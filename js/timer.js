const MS_PER_SEC=1000;

// Elapsed comes from wall-clock stamps, so a backgrounded phone keeps counting.
export const timer={running:false,startedAt:0,accumMs:0};

export function elapsedMs(){
  return timer.accumMs+(timer.running?Date.now()-timer.startedAt:0);
}

export function elapsedSeconds(){return Math.round(elapsedMs()/MS_PER_SEC);}

export function start(){
  if(timer.running)return;
  timer.running=true;
  timer.startedAt=Date.now();
}

export function stop(){
  if(!timer.running)return;
  timer.accumMs=elapsedMs();
  timer.running=false;
  timer.startedAt=0;
}

export function toggle(){timer.running?stop():start();}

export function reset(){timer.running=false;timer.startedAt=0;timer.accumMs=0;}

export function takeSeconds(){
  const s=elapsedSeconds();
  reset();
  return s;
}

export function snapshot(){
  return {running:timer.running,startedAt:timer.startedAt,accumMs:timer.accumMs};
}

export function restore(saved){
  if(!saved)return;
  timer.running=!!saved.running;
  timer.startedAt=saved.startedAt||0;
  timer.accumMs=saved.accumMs||0;
}
