import {SERVICE_SUITE,serviceMessages} from '/noyau-service-cases.js?v=A92';
import {PROJECT_PROTOCOL,projectMessages} from '/noyau-project-core.js?v=A100';
import {ENGINE_PROTOCOL,diagnosticCode,meteredModelStream} from '/blob-llm-evidence.js?v=A84';
import {runAnswerPipeline} from '/blob-response-pipeline.js?v=A111';
import {fitDialogueContext} from '/blob-context-budget.js?v=A110';
import {reviewAnswer,reviewInstruction} from '/blob-answer-review.js?v=A69';
import {reasoningGraph,runReasoningGraph} from '/blob-reasoning-graph.js?v=A68';
import {integratedMessages,integratedProposal} from '/blob-assistant-adapter.js?v=A63.2';
import {dialogueMessages,dialogueAnswer} from '/blob-dialogue-core.js?v=A111';
import {MODEL,CACHE,prepareModel,activateModel,openModelStream} from '/blob-assistant-model.js?v=A83';
import {loadOptions,PROFILES,PROBES} from '/blob-pilot-plan.js?v=A83';
import {runPilotCycle} from '/blob-pilot-cycle.js?v=A72.1';
import {WRITING_PROTOCOL,WRITING_STEPS} from '/aster-writing-core.js?v=A106';
import {STUDY_PROTOCOL,studyMessages} from '/aster-study-cases.js?v=A106';
import {HOME_PROTOCOL,HOME_LIMITS,homeMessages} from '/aster-conversation-core.js?v=A111';
import {workDecision,validateToolResult} from '/aster-work-core.js?v=A111';
let studyMode=false;
let lastOutputTokens=0,dialogueOutputLimit=256;
let generator=null,busy=false,calm=false,lastPacing=null,runtimeProfile=PROFILES[0],runtimeStats=null,probeMode=false;
const checkpointAcks=new Map();let checkpointSerial=0;
const toolAcks=new Map();let toolSerial=0,homeJobId=null;
async function toolStage(action){
 if(!homeJobId)throw Error('WORK_TOOL_SCOPE');
 action=workDecision(JSON.stringify(action));const id=++toolSerial;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{toolAcks.delete(id);reject(Error('WORK_TOOL_TIMEOUT'));},15000);
  toolAcks.set(id,(ok,value)=>{clearTimeout(timer);if(!ok){reject(Error(String(value||'WORK_TOOL_FAILED')));return;}try{resolve(validateToolResult(value));}catch(e){reject(e);}});
  self.postMessage({type:'TOOL_REQUEST',id,jobId:homeJobId,action});
 });
}
async function checkpointStage(value,label){
 const id=++checkpointSerial;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{checkpointAcks.delete(id);reject(Error('CHECKPOINT_STORAGE_TIMEOUT'));},15000);
  checkpointAcks.set(id,(ok,value)=>{clearTimeout(timer);ok?resolve(value):reject(Error('CHECKPOINT_STORAGE_FAILED'));});
  self.postMessage({type:'CHECKPOINT',id,checkpoint:value,label});
 });
}
const observed=(phase,label,tokens=0)=>self.postMessage({type:'STAGE',phase,label,tokens,observed:true});
const stage=(label,checkpoint)=>self.postMessage({type:'STAGE',label,checkpoint});
async function generate(messages,maxTokens,label){
 maxTokens=Math.min(maxTokens,dialogueOutputLimit);
 const started=performance.now();let tokensProduced=0;observed('READ',label+' · lecture du contexte');const heartbeat=setInterval(()=>self.postMessage({type:'STAGE',phase:tokensProduced?'GENERATE':'READ',tokens:tokensProduced,observed:false,label:label+' · '+Math.round((performance.now()-started)/1000)+' s écoulées · '+(tokensProduced?tokensProduced+' jetons produits':'première sortie attendue')}),5000);
 try{let last=0;
 const fitted=await fitDialogueContext(messages,(text,special)=>generator.tokenize(text,special),maxTokens,generator.getLoadedContextInfo().n_ctx);
 self.postMessage({type:'CONTEXT',label,inputTokens:fitted.inputTokens,budget:fitted.budget,droppedTurns:fitted.droppedTurns,droppedEvidence:fitted.droppedEvidence,retainedSources:fitted.retainedSources});
 const text=fitted.text;
 self.postMessage({type:'TECHNICAL',event:'REQUEST_STARTED'});
 const compute=()=>generator.createCompletion(text,{nPredict:maxTokens,useCache:!probeMode,sampling:{temp:studyMode?0:.3,top_p:.85,top_k:30,penalty_repeat:1.08},onNewToken:(_token,_piece,currentText)=>{tokensProduced++;if(tokensProduced===1)self.postMessage({type:'TECHNICAL',event:'FIRST_TOKEN',tokens:1});if(tokensProduced===1||performance.now()-last>600){last=performance.now();observed('GENERATE',label+' · '+tokensProduced+' jetons produits',tokensProduced);if(typeof currentText==='string'&&/^(Réponse|Correction)/.test(label))self.postMessage({type:'PARTIAL',text:currentText.slice(0,4800)});}}});
 if(!calm){const value=await compute();self.postMessage({type:'TECHNICAL',event:'GENERATION_FINISHED',tokens:tokensProduced});return value;}
 const {withCooperativeDecode}=await import('/blob-cooperative-decode.js?v=A72.3');
 const result=await withCooperativeDecode(generator,compute,{sliceMs:runtimeProfile.sliceMs||50,pauseMs:runtimeProfile.pauseMs||25,progress:p=>{if(tokensProduced===0&&performance.now()-last>1000){last=performance.now();self.postMessage({type:'STAGE',phase:'READ',observed:true,inputDecoded:p.decodedTokens,tokens:0,label:label+' · lecture par lots · '+p.decodedTokens+' jetons traités'});}}});
 self.postMessage({type:'TECHNICAL',event:'GENERATION_FINISHED',tokens:tokensProduced});lastPacing=result.stats;runtimeStats=runtimeStats||{runtime:lastPacing.runtime,batches:0,decodedTokens:0,pauses:0,idleMs:0,computeMs:0};for(const key of ['batches','decodedTokens','pauses','idleMs','computeMs'])runtimeStats[key]+=lastPacing[key];self.postMessage({type:'PACE',stats:lastPacing});return result.value;
 }finally{lastOutputTokens=tokensProduced;clearInterval(heartbeat);}
}
self.onmessage=async({data})=>{
 if(data?.type==='HELLO'){self.postMessage({type:'HELLO_ACK',nonce:data.nonce,protocol:ENGINE_PROTOCOL,homeProtocol:HOME_PROTOCOL,projectProtocol:PROJECT_PROTOCOL,writingProtocol:WRITING_PROTOCOL,studyProtocol:STUDY_PROTOCOL,serviceSuite:SERVICE_SUITE,model:MODEL.id,revision:MODEL.revision});return;}
 if(data.type==='CHECKPOINT_ACK'){const done=checkpointAcks.get(data.id);checkpointAcks.delete(data.id);done?.(data.ok===true,data.checkpoint);return;}
 if(data.type==='TOOL_RESULT'){if(data.jobId!==homeJobId)return;const done=toolAcks.get(data.id);toolAcks.delete(data.id);done?.(data.ok===true,data.ok?data.result:data.error);return;}
 if(busy)return;dialogueOutputLimit=data.type==='CHAT'&&data.homeProtocol===HOME_PROTOCOL?HOME_LIMITS.answerTokens:data.type==='PROJECT_STEP'?128:data.type==='CHAT'&&data.localLearning===true?96:256;busy=true;studyMode=data.type==='STUDY_STEP';probeMode=['PROBE','EVALUATE','STUDY_STEP'].includes(data.type);calm=runtimeProfile.sliceMs>0||(data.type==='CHAT'&&data.mode==='deep');lastPacing=null;runtimeStats=null;
 try{
  if(data.type==='PREPARE'){
   const report=await prepareModel(p=>self.postMessage({type:'DOWNLOAD',...p}),undefined,{allowFullRestart:data.allowFullRestart===true});
   self.postMessage({type:'PREPARED',model:MODEL.id,revision:MODEL.revision,report,cleanup:{removed:0}});
  }else if(data.type==='LOAD'){
   const started=performance.now();let loading=true,nativeCount=0,lastRead=0;
   const boundary=(event,extra={})=>self.postMessage({type:'TECHNICAL',event,...extra});
   boundary('LOAD_RECEIVED');observed('LOAD','Activation · commande reçue par le moteur');
   globalThis.document={baseURI:self.location.href};
   boundary('RUNTIME_IMPORT_STARTED');
   const {Wllama}=await import('/vendor/wllama/index.js');
   boundary('RUNTIME_IMPORTED');
   const native=(...args)=>{if(!loading||nativeCount>=16)return;const text=args.filter(v=>typeof v==='string').join(' ').slice(0,1000);if(!/error|fail|abort|invalid|mismatch|unsupported|out of memory|cannot|overflow|exception/i.test(text))return;const code=diagnosticCode(text);if(code!=='UNKNOWN'){nativeCount++;boundary('NATIVE_DIAGNOSTIC',{code});}};
   generator=new Wllama({'single-thread/wllama.wasm':new URL('/vendor/wllama/wllama.wasm',self.location.href).href},{suppressNativeLog:false,allowOffline:true,logger:{debug(){},log:native,warn:native,error:native}});
   observed('LOAD','Activation · ouverture du cache local vérifié');
   const modelStream=meteredModelStream(await openModelStream(),(bytes,total)=>{if(bytes===total||performance.now()-lastRead>=1000){lastRead=performance.now();boundary('CACHE_READ',{cacheReadBytes:bytes,modelBytes:total});observed('LOAD','Lecture locale · '+Math.floor(bytes/1000000)+' / '+Math.ceil(total/1000000)+' Mo · pas un téléchargement réseau');}});
   boundary('CACHE_OPEN',{modelBytes:modelStream.size});
   runtimeProfile=PROFILES.find(p=>p.id===(data.profile||PROFILES[0].id))||PROFILES[0];
   try{await generator.loadModel([modelStream],{...loadOptions(runtimeProfile.id),...(data.projectWork===true?{n_ctx:1024}:{}),...(data.homeProtocol===HOME_PROTOCOL?{n_ctx:HOME_LIMITS.context}:{}),...(data.probe===true?{seed:1729}:{})});}finally{loading=false;}
   boundary('MODEL_READY');
   const info=generator.getLoadedContextInfo();
   if(info.n_batch!==64||info.n_ubatch>info.n_batch)throw Error('MODEL_NATIVE_BATCH_MISMATCH');
   self.postMessage({type:'READY',model:MODEL.id,revision:MODEL.revision,profile:runtimeProfile.id,actual:{n_batch:info.n_batch,n_ctx:info.n_ctx,n_ubatch:info.n_ubatch,n_threads:generator.getNumThreads(),sliceMs:runtimeProfile.sliceMs,pauseMs:runtimeProfile.pauseMs},device:'wasm',dtype:MODEL.dtype,loadWallMs:performance.now()-started});
  }else if(data.type==='PROBE'){
   if(!generator)throw Error('MODEL_NOT_READY');
   if(data.caseId==='ready'){self.postMessage({type:'PROBE_RESULT',model:MODEL.id,revision:MODEL.revision,caseId:'ready',answer:'ready',runtimeStats:{runtime:'READY_ONLY'},elapsedMs:0,proofGranted:false});return;}
   const test=PROBES.find(p=>p.id===data.caseId);if(!test)throw Error('PROBE_NOT_ALLOWED');
   const started=performance.now();
   const probeMessages=test.minimal?[{role:'user',content:test.text}]:dialogueMessages(test.text,test.context||{});
   const result=test.pipeline===true?await runPilotCycle({text:test.text,messages:probeMessages,model:{id:MODEL.id,revision:MODEL.revision},generate:(m,n,label)=>generate(m,Math.min(n,test.maxTokens||32),label),checkpoint:checkpointStage}):{answer:await generate(probeMessages,test.maxTokens||32,'Contrôle local synthétique')};
   self.postMessage({type:'PROBE_RESULT',model:MODEL.id,revision:MODEL.revision,caseId:test.id,...result,outputTokens:lastOutputTokens,runtimeStats,elapsedMs:performance.now()-started,proofGranted:false});
  }else if(data.type==='EVALUATE'){
   if(!generator)throw Error('MODEL_NOT_READY');
   const started=performance.now(),messages=serviceMessages(data.caseId);
   const answer=await generate(messages,64,'Extraction métier fictive');
   self.postMessage({type:'EVAL_RESULT',model:MODEL.id,revision:MODEL.revision,caseId:data.caseId,answer,outputTokens:lastOutputTokens,elapsedMs:performance.now()-started});
  }else if(data.type==='COMPOSE'){
   if(!generator)throw Error('MODEL_NOT_READY');
   if(typeof data.prompt!=='string'||data.prompt.length>1600)throw Error('COMPOSITION_INPUT_INVALID');
   const started=performance.now(),answer=await generate([{role:'user',content:data.prompt}],96,'Proposition à relire');
   self.postMessage({type:'COMPOSED',answer,outputTokens:lastOutputTokens,elapsedMs:performance.now()-started,verifiedFacts:false});
  }else if(data.type==='STUDY_STEP'){
   if(!generator)throw Error('MODEL_NOT_READY');
   if(typeof data.requestId!=='string'||!data.requestId||data.requestId.length>100)throw Error('STUDY_INPUT_INVALID');
   const messages=studyMessages(data.packet),started=performance.now();
   const answer=await generate(messages,64,'Exercice pratique');
   self.postMessage({type:'STUDY_RESULT',requestId:data.requestId,answer,outputTokens:lastOutputTokens,elapsedMs:performance.now()-started});
  }else if(data.type==='STUDIO_COMPOSE'){
   if(!generator)throw Error('MODEL_NOT_READY');
   const step=WRITING_STEPS.find(s=>s.id===data.stepId);
   if(!step||typeof data.requestId!=='string'||data.requestId.length>100||typeof data.prompt!=='string'||!data.prompt.trim()||data.prompt.length>1600)throw Error('COMPOSITION_INPUT_INVALID');
   const started=performance.now(),answer=await generate([{role:'user',content:data.prompt,required:true}],step.tokens,step.label+' · proposition à relire');
   self.postMessage({type:'STUDIO_COMPOSED',requestId:data.requestId,answer,outputTokens:lastOutputTokens,elapsedMs:performance.now()-started,verifiedFacts:false});
  }else if(data.type==='PROJECT_STEP'){
   if(!generator)throw Error('MODEL_NOT_READY');
   const a=data.attempt;
   if(typeof a?.input!=='string'||!a.input.trim()||a.input.length>1800||!Array.isArray(a.passages)||a.passages.length>2)throw Error('PROJECT_INPUT_INVALID');
   const result=await runAnswerPipeline({text:a.input,mode:'deep',context:{localOnly:true},checkpoint:a.checkpoint},projectMessages(a),{model:{id:MODEL.id,revision:MODEL.revision},generate,save:checkpointStage,stage});
   self.postMessage({type:'PROJECT_RESULT',answer:result.answer,reusedFinal:result.review.reusedFinal===true,verifiedFacts:false});
  }else if(data.type==='CHAT'){
   if(!generator)throw Error('MODEL_NOT_READY');const started=performance.now(),messages=data.homeProtocol===HOME_PROTOCOL?homeMessages(data.text,data.context):dialogueMessages(data.text,data.context);let raw;
   homeJobId=data.homeProtocol===HOME_PROTOCOL&&typeof data.jobId==='string'&&data.jobId.length<=100?data.jobId:null;
   const result=await runAnswerPipeline(data,messages,{model:{id:MODEL.id,revision:MODEL.revision},generate,save:checkpointStage,stage,tool:toolStage});
   const answer=result.answer,review=result.review;let activationSaved=true,activationWarning=null;
   // The pipeline has already durably saved the final answer. An optional cache
   // marker must not turn that completed response into a generation failure.
   try{await activateModel();}catch(e){activationSaved=false;activationWarning=String(e.message||e).slice(0,200);}
   self.postMessage({type:'ANSWER',answer,review,localWork:result.localWork||null,activationSaved,activationWarning,elapsedMs:performance.now()-started,proofGranted:false});
  }else if(data.type==='ASK'){
   if(!generator)throw Error('MODEL_NOT_READY');const started=performance.now(),{messages,choices}=integratedMessages(data.text,data.context),raw=await generate(messages,8,'Choix de recette');
   self.postMessage({type:'PLAN',proposal:integratedProposal(raw,choices),elapsedMs:performance.now()-started});
  }
 }catch(e){self.postMessage({type:'TECHNICAL',event:'NATIVE_DIAGNOSTIC',code:diagnosticCode(String(e.message||e))});self.postMessage({type:'ERROR',stage:data.type,message:String(e.message||e).slice(0,300)});}finally{busy=false;homeJobId=null;}
};
