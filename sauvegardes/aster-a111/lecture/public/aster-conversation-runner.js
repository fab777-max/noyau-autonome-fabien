import {MODEL,MODEL_MODE,cacheReport} from '/blob-assistant-model.js?v=A83';
import {workerModelOptions} from '/blob-model-choice.js?v=A100';
import {reserveEngine} from '/blob-local-pilot.js?v=A91';
import {ENGINE_PROTOCOL} from '/blob-llm-evidence.js?v=A91';
import {HOME_LIMITS,HOME_PROTOCOL} from '/aster-conversation-core.js?v=A111';
import {WORK_LIMITS,workDecision,validateToolResult} from '/aster-work-core.js?v=A111';

// Explicit owner request only. A single Worker, no automatic downloads or retry loop.
export async function runHomeDialogue(job,{saveCheckpoint,onTool,onProgress=()=>{},onContext=()=>{},onPartial=()=>{},signal}={}){
 const controller=new AbortController(),abort=()=>controller.abort(Error('Travail mis en pause. Reprise manuelle depuis le dernier point enregistré.'));
 const hidden=()=>{if(document.hidden)abort();};
 const check=()=>{if(signal?.aborted||document.hidden)abort();controller.signal.throwIfAborted();};
 signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);globalThis.addEventListener?.('pagehide',abort);
 const sessionMs=job.mode==='deep'?HOME_LIMITS.sessionMs:HOME_LIMITS.directMs;
 const deadline=setTimeout(()=>controller.abort(Error('Budget de '+Math.round(sessionMs/60000)+' minutes atteint pour ce lancement. Le dernier point enregistré peut être repris.')),sessionMs);
 let worker,release,waiting,checkpointWrite=Promise.resolve(),checkpointFailed=false,requestStarted=0;
 const timings={loadMs:null,firstTokenMs:null,generationMs:0,outputTokens:0,generations:0};
 let lastToolId=0,toolWrite=Promise.resolve();
 function call(message,expected,timeout){
  check();if(waiting)throw Error('Un calcul est déjà en cours.');
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>done(Error('Le moteur ne répond plus. Le point de reprise reste conservé.')),timeout);
   const stop=()=>done(controller.signal.reason||Error('Travail interrompu.'));
   function done(error,value){if(waiting?.done!==done)return;clearTimeout(timer);controller.signal.removeEventListener('abort',stop);waiting=null;error?reject(error):resolve(value);}
   waiting={expected,done};controller.signal.addEventListener('abort',stop,{once:true});worker.postMessage(message);
  });
 }
 try{
  check();onProgress({label:'Vérification du modèle installé',phase:'PREPARE'});
  if(job.homeProtocol!==HOME_PROTOCOL||job.model!==MODEL.id||job.modelRevision!==MODEL.revision)throw Error('Cette demande appartient à une autre version du moteur. Elle reste conservée ; envoie une nouvelle demande pour la reprendre avec cette version.');
  if(!(await cacheReport()).complete)throw Object.assign(Error('Le modèle local doit être installé pour discuter. Ta demande est enregistrée ; aucun téléchargement n’a été lancé.'),{code:'MODEL_MISSING'});
  check();if(!navigator.locks?.request)throw Error('Ce navigateur ne permet pas de réserver le calcul entre onglets.');
  release=await reserveEngine();if(!release)throw Error('Un autre travail utilise le modèle. Mets-le en pause avant de reprendre.');check();
  worker=new Worker('/blob-assistant-worker.js?v=A111&llm='+MODEL_MODE,workerModelOptions(MODEL_MODE));
  worker.onerror=worker.onmessageerror=()=>waiting?.done(Error('Moteur interrompu ; demande conservée.'));
  worker.onmessage=({data:p})=>{
   if(!p||!waiting)return;
   if(p.type==='STAGE'){onProgress({label:String(p.label||'Calcul local').slice(0,180),phase:p.phase,tokens:p.tokens});return;}
   if(p.type==='CONTEXT'){onContext(p);return;}
   if(p.type==='PARTIAL'){if(typeof p.text==='string')onPartial(p.text.slice(0,4800));return;}
   if(p.type==='TOOL_REQUEST'){
    if(p.jobId!==job.id||waiting.expected!=='ANSWER'||job.mode!=='deep'||!Number.isInteger(p.id)||p.id<=lastToolId||p.id>WORK_LIMITS.decisions){waiting.done(Error('Demande d’outil incompatible.'));return;}
    lastToolId=p.id;
    toolWrite=toolWrite.then(async()=>{check();if(typeof onTool!=='function')throw Error('Outils locaux indisponibles.');const result=validateToolResult(await onTool(workDecision(JSON.stringify(p.action))));check();worker.postMessage({type:'TOOL_RESULT',id:p.id,jobId:job.id,ok:true,result});}).catch(error=>{try{worker?.postMessage({type:'TOOL_RESULT',id:p.id,jobId:job.id,ok:false,error:error.message});}catch{}waiting?.done(error);});return;
   }
   if(p.type==='TECHNICAL'){
    if(p.event==='REQUEST_STARTED'){requestStarted=performance.now();timings.generations++;onPartial('');}
    if(p.event==='FIRST_TOKEN'&&timings.firstTokenMs===null)timings.firstTokenMs=performance.now()-requestStarted;
    if(p.event==='GENERATION_FINISHED'){timings.generationMs+=performance.now()-requestStarted;timings.outputTokens+=Number.isFinite(p.tokens)?Math.max(0,p.tokens):0;}
    return;
   }
   if(p.type==='CHECKPOINT'){
    checkpointWrite=checkpointWrite.then(async()=>{
     check();await saveCheckpoint(structuredClone(p.checkpoint));check();worker.postMessage({type:'CHECKPOINT_ACK',id:p.id,ok:true,checkpoint:p.checkpoint});
    }).catch(error=>{checkpointFailed=true;try{worker?.postMessage({type:'CHECKPOINT_ACK',id:p.id,ok:false});}catch{}waiting?.done(error);});return;
   }
   if(p.type==='ERROR'){waiting.done(Error(p.message==='DIALOGUE_CONTEXT_TOO_LONG'?'La demande complète dépasse le contexte disponible. Raccourcis-la ou sépare-la en deux ; elle n’a pas été coupée.':p.message==='DIALOGUE_OUTPUT_REJECTED'?'La réponse a échoué aux contrôles de sortie. Demande conservée ; aucun nouvel essai automatique.':String(p.message||'Calcul interrompu').slice(0,250)));return;}
   if(p.type===waiting.expected)waiting.done(null,p);
  };
  const nonce=crypto.randomUUID(),hello=await call({type:'HELLO',nonce},'HELLO_ACK',20000);
  if(hello.nonce!==nonce||hello.protocol!==ENGINE_PROTOCOL||hello.homeProtocol!==HOME_PROTOCOL||hello.model!==MODEL.id||hello.revision!==MODEL.revision)throw Error('Mise à jour du moteur nécessaire. Rouvre la page après avoir conservé ton brouillon.');
  onProgress({label:'Chargement des poids depuis cet appareil',phase:'LOAD'});
  const loadStarted=performance.now();
  const ready=await call({type:'LOAD',profile:'safe-64',homeProtocol:HOME_PROTOCOL},'READY',480000);
  timings.loadMs=performance.now()-loadStarted;
  if(ready.model!==MODEL.id||ready.revision!==MODEL.revision||ready.actual?.n_ctx!==HOME_LIMITS.context||ready.actual?.n_batch!==64||ready.actual?.n_threads!==1||ready.actual?.sliceMs!==25||ready.actual?.pauseMs!==50)throw Error('Configuration locale non confirmée.');
  const result=await call({type:'CHAT',jobId:job.id,homeProtocol:HOME_PROTOCOL,text:job.text,context:job.context,mode:job.mode,localLearning:false,checkpoint:job.checkpoint},'ANSWER',sessionMs);
  await checkpointWrite;await toolWrite;check();if(checkpointFailed)throw Error('Enregistrement non confirmé.');
  return {...result,timings};
 }finally{
  clearTimeout(deadline);worker?.terminate();await checkpointWrite;release?.();signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);globalThis.removeEventListener?.('pagehide',abort);
 }
}
