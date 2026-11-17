// Original adaptive score. All cues share D-minor harmony for smooth transitions.
// Finite phrases include breathing room; no engine noise or pitch sweeps.
export function composeMusic(sampleRate = 22050, mode = 'explore') {
  const durations={explore:32,launch:8,cruise:16,approach:8,descent:8,arrival:6,reading:32,detail:2};
  const duration=durations[mode]||32,length=Math.round(duration*sampleRate);
  const left=new Float32Array(length),right=new Float32Array(length);
  function note(midi,start,seconds,volume,kind='bell',pan=0){
    const hz=440*2**((midi-69)/12),offset=Math.round(start*sampleRate);
    for(let i=0;i<seconds*sampleRate&&offset+i<length;i++){
      const t=i/sampleRate,p=2*Math.PI*hz*t;
      const organ=kind==='organ',attack=organ?.4:.018,release=organ?.9:.3;
      const env=Math.min(1,t/attack)*Math.min(1,(seconds-t)/release)*(organ?1:Math.exp(-t/(kind==='pulse'?.20:1.1)));
      const wave=Math.sin(p)+.22*Math.sin(2*p)+(organ?.13:.045)*Math.sin(3*p);
      const v=wave*env*volume;
      left[offset+i]+=v*Math.sqrt((1-pan)/2);right[offset+i]+=v*Math.sqrt((1+pan)/2);
    }
  }
  function chord(notes,t,len,vol=.12){notes.forEach((n,i)=>note(n,t,len,vol,'organ',(i-1.5)*.22));}
  if(mode==='explore'||mode==='reading'){
    const quiet=mode==='reading';
    [[50,57,62,65],[46,53,62,65],[48,55,62,64]].forEach((c,i)=>{
      const t=i*10;chord(c,t,quiet?4:7,quiet?.065:.11);
      [74,77,69].forEach((n,j)=>note(n,t+1+j*(quiet?1.1:1.5),1.9,quiet?.10:.15,'bell',j%2?.35:-.35));
    });
  }else if(mode==='launch'){
    chord([50,57,62,65],0,8,.13);
    [62,65,69,74,77,81,86].forEach((n,i)=>note(n,.2+i*.65,1.8,.16,'bell',i%2?.3:-.3));
  }else if(mode==='cruise'){
    [[50,57,62,65],[46,53,62,65],[48,55,62,64],[50,57,62,65]].forEach((c,j)=>{
      chord(c,j*4,4,.10);
      for(let i=0;i<8;i++)note(c[[0,2,1,3,2,1,3,2][i]]+12,j*4+i*.5,.9,.14,'pulse',i%2?.4:-.4);
      note([77,74,76,81][j],j*4+.25,2.8,.17);
    });
  }else if(mode==='approach'||mode==='descent'){
    chord(mode==='approach'?[45,57,61,64]:[50,57,62,65],0,7,.11);
    (mode==='approach'?[81,77,76,73]:[77,74,69]).forEach((n,i)=>note(n,.15+i*1.3,2.2,.16,'bell',i%2?.25:-.25));
  }else if(mode==='arrival'){
    chord([50,57,62,65],.05,5,.16);
    [69,74,77,86].forEach((n,i)=>note(n,.1+i*.22,3.4,.19,'bell',i%2?.35:-.35));
  }else if(mode==='detail'){
    [74,77].forEach((n,i)=>note(n,i*.16,1.7,.12,'bell',i?.25:-.25));
  }
  // Fixed gain preserves intentional differences in intensity between cues.
  for(let i=0;i<length;i++){left[i]*=.85;right[i]*=.85;}
  return {left,right,sampleRate,duration:length/sampleRate};
}

export function createSound(onChange=()=>{}){
  let context,master,filter,active,enabled=false,day=false,reading=false,flying=false;
  let mode='explore',request=0;
  const buffers=new Map();
  function levels(){if(!context)return;master.gain.setTargetAtTime(enabled?.85:0,context.currentTime,.12);filter.frequency.setTargetAtTime(day?4000:2600,context.currentTime,.8);}
  function initialize(){
    if(context)return;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw new Error('Audio playback is unavailable.');
    context=new Audio();master=context.createGain();master.gain.value=0;
    filter=context.createBiquadFilter();filter.type='lowpass';filter.connect(master);master.connect(context.destination);
  }
  function play(next,force=false){
    mode=next;if(!context||!enabled)return;
    if(!force&&active?.mode===next)return;
    if(!buffers.has(next)){
      const score=composeMusic(22050,next),buffer=context.createBuffer(2,score.left.length,score.sampleRate);
      buffer.getChannelData(0).set(score.left);buffer.getChannelData(1).set(score.right);buffers.set(next,buffer);
    }
    const now=context.currentTime,previous=active,source=context.createBufferSource(),gain=context.createGain();
    source.buffer=buffers.get(next);source.loop=['explore','cruise','reading'].includes(next);
    source.connect(gain);gain.connect(filter);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.45);
    const entry={source,gain,mode:next};active=entry;
    source.onended=()=>{source.disconnect();gain.disconnect();if(active===entry){active=null;if(mode===next&&(next==='arrival'||next==='detail'))play(reading?'reading':'explore');}};
    source.start();
    if(previous){previous.gain.gain.cancelScheduledValues(now);previous.gain.gain.setValueAtTime(previous.gain.gain.value,now);previous.gain.gain.linearRampToValueAtTime(0,now+.45);previous.source.stop(now+.5);}
  }
  return {
    async start(){const ticket=++request;try{initialize();await context.resume();if(ticket!==request)return false;if(context.state!=='running')throw new Error('Playback could not start.');enabled=true;levels();play(mode);onChange(true);return true;}catch(error){if(ticket===request){enabled=false;levels();onChange(false,error);}return false;}},
    toggle(){if(enabled){request++;enabled=false;levels();onChange(false);return false;}return this.start();},
    flight(value){flying=value;if(value){reading=false;play('launch');}else play(reading?'reading':'explore');},
    phase(value){if(flying&&['launch','cruise','approach','descent'].includes(value)&&mode!==value)play(value);},
    arrive(){flying=false;reading=true;play('arrival');},
    panel(value){reading=value;if(value&&mode==='arrival')return;play(value?'reading':'explore');},
    theme(value){day=value==='day';levels();},
    chime(){if(reading&&!flying)play('detail',true);},
    async visibility(hidden){if(!context)return;try{if(hidden)await context.suspend();else if(enabled){await context.resume();levels();}}catch(error){enabled=false;levels();onChange(false,error);}},
    get enabled(){return enabled;},get mode(){return mode;}
  };
}
