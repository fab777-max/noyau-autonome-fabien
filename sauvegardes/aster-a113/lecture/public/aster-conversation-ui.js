import {MODEL,cacheReport,prepareModel,storagePlan} from '/blob-assistant-model.js?v=A83';
import {readLocalState,commitLocalState,reserveDialogueAnswer,ensureDialogueCapacity,archiveConversation,restoreArchivedJob} from '/noyau-dialogue-store.js?v=A113';
import {recordContextUse} from '/noyau-learning.js?v=A91';
import {replacePersonalNote} from '/blob-personal-core.js?v=A113';
import {DOCUMENTS_KEY,documentsState,readTextFile,addDocument,removeDocument,excerptLabel} from '/noyau-documents-core.js?v=A100';
import {commitDocuments} from '/noyau-documents-store.js?v=A100';
import {correctedRows,exportCorrections} from '/aster-conversation-learning.js?v=A113';
import {HOME_PROTOCOL,HOME_LIMITS,HOME_CAPABILITIES,memoryCommand,applyMemoryCommand,preferencePatch,dialogueContext,allDialogue,documentContext,workMode,timingEstimate,duration} from '/aster-conversation-core.js?v=A113';
import {runHomeDialogue} from '/aster-conversation-runner.js?v=A113';
import {documentSignature,executeLocalTool} from '/aster-work-core.js?v=A113';
import {WORK_BUDGET,initialWorkControl,workCommand,workProgress,approveWork,awaitingWork} from '/aster-work-budget.js?v=A113';

export async function initConversationUI({db,root,execute,status,onAccepted,onDraft}={}){
 const memory=window.BlobLocalMemory;
 let state=await readLocalState(db),controller=null,started=0,elapsed=state.job?.elapsedMs||0,stage='',timer=null,stale=false,lastContext=null,lastAnswerContext=null,displayCount=40,estimate=null,exportURL=null,archiveURL=null;
 let documents=documentsState(await memory.setting(db,DOCUMENTS_KEY));
 let usage=state.job?.usage||{outputTokens:0,generations:0};
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(label,fn,cls='secondary')=>{const b=el('button',label,cls);b.type='button';b.onclick=fn;return b;};
 const log=el('div',null,'messages general-messages');log.setAttribute('role','log');log.setAttribute('aria-live','polite');
 const older=button('Afficher les échanges précédents',()=>{displayCount+=40;renderLog();},'quiet');
 const work=el('section',null,'conversation-work'),title=el('strong'),requestText=el('p'),progress=el('p'),clock=el('p',null,'helper'),contextLine=el('p',null,'helper'),actions=el('div',null,'details-actions');
 const partial=el('div',null,'conversation-partial'),partialText=el('p');partial.hidden=true;partial.append(el('small','Brouillon en cours · pas encore vérifié ni enregistré'),partialText);
 work.setAttribute('aria-label','Travail en cours');progress.setAttribute('role','status');progress.setAttribute('aria-live','polite');work.append(title,requestText,progress,clock,contextLine,partial,actions);
 const pause=button('Mettre en pause',()=>controller?.abort()),resume=button('Reprendre ce travail',()=>execute(()=>run())),install=button('Installer le modèle · '+Math.ceil(MODEL.modelBytes/1000000)+' Mo',()=>execute(download));
 const recover=button('Reprendre cette demande dans le champ',()=>onDraft(state.job.text),'quiet');
 const extend=button('Continuer · 4 étapes maximum',()=>execute(()=>chooseContinuation('continue'))),finish=button('Répondre maintenant',()=>execute(()=>chooseContinuation('finish')));
 const archive=el('details'),archiveTitle=el('summary','Demandes mises de côté'),archiveRows=el('div');archive.append(archiveTitle,archiveRows);
 actions.append(pause,resume,extend,finish,install,recover);
 const preferences=el('details',null,'conversation-memory'),summary=el('summary','Ce que je retiens'),notes=el('div'),noteStatus=el('p',null,'helper');preferences.append(summary,notes,noteStatus);
 const history=el('details'),historyRows=el('div');history.append(el('summary','Conversations archivées'),historyRows);
 preferences.append(button('Archiver cette conversation et continuer',()=>execute(async()=>{safe();if(controller)throw Error('Mets le travail en pause avant d’archiver.');await commit(s=>archiveConversation(s,crypto.randomUUID()));renderLog();renderHistory();status('Conversation archivée sur cet appareil. Tu peux poursuivre ici ; tes notes et ton travail en pause restent conservés.');})),history);
 const options=el('details',null,'conversation-options'),optionsTitle=el('summary','Pour cette réponse'),deepLabel=el('label',null,'approval'),deep=el('input');deep.type='checkbox';deepLabel.append(deep,el('span','Prendre le temps : rechercher, répondre et relire'));
 const sourcesLabel=el('label',null,'approval'),useDocuments=el('input');useDocuments.type='checkbox';sourcesLabel.append(useDocuments,el('span','Chercher aussi dans mes documents locaux déjà importés'));
 const documentSelect=el('select');documentSelect.setAttribute('aria-label','Document à utiliser');
 const documentInfo=el('p',null,'helper'),documentActions=el('div',null,'details-actions');
 const importInput=el('input');importInput.type='file';importInput.accept='.txt,.md,text/plain,text/markdown';importInput.hidden=true;
 importInput.onchange=()=>execute(async()=>{try{if(importInput.files?.[0])await importDocument(importInput.files[0]);}finally{importInput.value='';}});
 const chooseFile=button('Ajouter un fichier TXT ou MD',()=>{safe();if(!controller)importInput.click();});
 const removeFile=button('Retirer le document choisi',()=>execute(async()=>{if(!documentSelect.value)throw Error('Choisis d’abord un document.');documents=await commitDocuments(db,documents.revision,s=>removeDocument(s,documentSelect.value));documentSelect.value='';useDocuments.checked=false;renderDocuments();status('Document retiré de la collection. Les extraits déjà cités restent dans tes échanges.');}),'quiet');
 documentActions.append(chooseFile,removeFile);documentSelect.onchange=()=>{useDocuments.checked=true;};
 const reviewed=el('details'),reviewedTitle=el('summary','Mes corrections'),reviewedInfo=el('p',null,'helper'),correctionDownload=el('div');
 reviewed.append(reviewedTitle,reviewedInfo,button('Exporter les exemples autorisés',()=>execute(async()=>{const data=exportCorrections(state.dialogue);if(!data.examples.length)throw Error('Aucune correction autorisée pour un futur entraînement. Ce choix se fait sous la réponse corrigée.');if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=el('a','Télécharger mes exemples privés');link.href=exportURL;link.download='aster-corrections-privees.json';correctionDownload.replaceChildren(link);status(data.examples.length+' exemple(s) exportable(s). Aucun entraînement lancé.');})),correctionDownload);
 const capabilities=el('p',HOME_CAPABILITIES.map(x=>x.label+' : '+x.detail).join('\n'),'helper');
 options.append(optionsTitle,deepLabel,sourcesLabel,documentSelect,documentInfo,documentActions,importInput,el('p','Garde la page visible pendant le calcul. Si tu la quittes, les étapes enregistrées restent conservées : reviens et reprends le travail. En mode approfondi, Aster demande ton accord avant de dépasser quatre étapes. Chaque lancement dure au plus trente minutes, dix en discussion simple. Aucun entraînement des poids.','helper'),capabilities);
 root.append(older,log,work,archive,preferences,reviewed,options);
 const safe=()=>{if(stale)throw Error('Une restauration a eu lieu. Rouvre la page avant de continuer.');};
 async function commit(change){safe();state=await commitLocalState(db,state.revision,change);return state;}
 function renderLog(){
  if(exportURL){URL.revokeObjectURL(exportURL);exportURL=null;correctionDownload.replaceChildren();}
  older.hidden=state.dialogue.length<=displayCount;log.replaceChildren();
  for(let index=Math.max(0,state.dialogue.length-displayCount);index<state.dialogue.length;index++){
   const m=state.dialogue[index];
   const p=el('div',null,'message '+m.role);p.append(el('span',m.role==='user'?'Toi':'Aster','who'),document.createTextNode(m.content));
   if(m.role==='assistant'&&m.work){if(m.work.usage?.outputTokens)p.append(el('small',m.work.usage.outputTokens+' tokens produits dans les étapes terminées.','answer-meta'));p.append(el('small',duration(m.work.wallMs)+' · '+(m.work.mode==='deep'?'Recherche et relecture':'Réponse locale')+' · faits à vérifier','answer-meta'));if(m.work.warning)p.append(el('small',m.work.warning,'answer-meta'));if(m.work.sources?.length)p.append(el('small','Contexte utilisé : '+m.work.sources.map(s=>s.title||s.source).join(' ; '),'answer-meta'));}
   if(m.work?.localWork){const detail=el('details');detail.append(el('summary','Travail local effectué'));for(const r of m.work.localWork.receipts||[]){const names={search_documents:'Recherche documentaire',read_document:'Lecture d’un passage',recall_conversation:'Recherche dans les échanges',calculate:'Calcul'};detail.append(el('p',(names[r.action.tool]||'Outil local')+' : '+(r.action.query||r.action.expression||r.action.id||'')+' · '+(r.result.message||r.result.status)));for(const x of r.result.evidence)detail.append(el('small',x.title),el('blockquote',x.text));}detail.append(el('p',m.work.localWork.stop||''),el('small','La relecture du modèle peut elle-même se tromper.'));p.append(detail);}
   if(m.work?.excerpts?.length){const detail=el('details');detail.append(el('summary','Extraits utilisés · lecture partielle'));for(const x of m.work.excerpts)detail.append(el('small',x.title),el('blockquote',x.text));p.append(detail);}
   if(m.role==='assistant'&&m.source!=='LOCAL_COMMAND'&&state.dialogue[index-1]?.role==='user')p.append(correctionEditor(m,index));
   log.append(p);
  }
  const count=state.dialogue.filter(m=>m.correction).length;reviewedInfo.textContent=count+'/32 corrections. Seules les corrections autorisées et pertinentes aident les réponses suivantes. Les poids du modèle restent inchangés.';
 }
 function correctionEditor(message,index){
  const detail=el('details'),text=el('textarea'),reuse=el('input'),training=el('input');text.value=message.correction?.text||'';text.maxLength=1200;text.rows=3;text.setAttribute('aria-label','Ta réponse corrigée');reuse.type=training.type='checkbox';reuse.checked=message.correction?.reuse??true;training.checked=message.correction?.trainingConsent??false;
  detail.append(el('summary',message.correction?'Ta correction enregistrée':'Corriger cette réponse'),text);
  for(const [input,label]of [[reuse,'Utiliser cette correction sur un sujet proche'],[training,'Autoriser cet exemple pour un futur entraînement privé']]){const row=el('label',null,'approval');row.append(input,el('span',label));detail.append(row);}
  const save=button('Enregistrer ma correction',()=>execute(async()=>{await commit(s=>{const dialogue=correctedRows(s.dialogue,index,text.value,{reuse:reuse.checked,trainingConsent:training.checked});return{dialogue,...preferencePatch({...s,dialogue},s.personal)};});renderLog();renderWork();status('Correction enregistrée. Elle pourra guider une réponse pertinente ; aucun entraînement des poids lancé.');}));
  detail.append(save);
  if(message.correction)detail.append(button('Retirer cette correction',()=>execute(async()=>{await commit(s=>{const dialogue=structuredClone(s.dialogue);delete dialogue[index].correction;return{dialogue,...preferencePatch({...s,dialogue},s.personal)};});renderLog();renderWork();status('Correction retirée. La réponse originale reste conservée.');}),'quiet'));
  return detail;
 }
 function renderDocuments(){
  const selected=documentSelect.value;documentSelect.replaceChildren();const all=el('option','Tous mes documents');all.value='';documentSelect.append(all);for(const d of documents.documents){const option=el('option',d.title);option.value=d.id;documentSelect.append(option);}documentSelect.value=documents.documents.some(d=>d.id===selected)?selected:'';
  documentInfo.textContent=documents.documents.length+'/12 fichiers sur cet appareil. Seuls de courts extraits utiles seront lus, pas le document entier. TXT ou MD, 24 000 caractères maximum par fichier.';
 }
 async function importDocument(file){
  safe();const expected=documents.revision,parsed=await readTextFile(file);safe();
  const id=crypto.randomUUID();documents=await commitDocuments(db,expected,s=>addDocument(s,parsed,id));safe();renderDocuments();documentSelect.value=id;useDocuments.checked=true;options.open=true;status('Fichier enregistré. Pose ta question dans la conversation.');
 }
 function renderNotes(){
  notes.replaceChildren();for(const note of state.personal.notes){
   const row=el('div',null,'memory-note'),text=el('textarea');text.value=note.text;text.maxLength=500;text.rows=2;text.setAttribute('aria-label','Note personnelle');
   const save=button('Enregistrer',()=>execute(async()=>{await commit(s=>preferencePatch(s,replacePersonalNote(s.personal,note.text,text.value)));stage='';renderNotes();renderWork();status('Note mise à jour.');}));
   const remove=button('Oublier',()=>execute(async()=>{await commit(s=>preferencePatch(s,replacePersonalNote(s.personal,note.text,'')));stage='';renderNotes();renderWork();status('Note oubliée. Les anciens messages restent dans l’historique.');}),'quiet');
   text.disabled=!!controller;save.disabled=remove.disabled=!!controller;row.append(text,save,remove);notes.append(row);
  }
  noteStatus.textContent=state.personal.notes.length+'/32 notes sur cet appareil. Dis « Retiens que… » pour en ajouter. Les anciens échanges sont conservés, mais seules quelques informations utiles entrent dans chaque réponse.';
 }
 function tick(){
  const active=controller?performance.now()-started:0,total=elapsed+active;
  clock.textContent=(total?'Temps mesuré : '+duration(total)+'. ':'')+(controller?(estimate?'Repère de '+duration(estimate.lowMs)+' à '+duration(estimate.highMs)+' par lancement, d’après '+estimate.samples+' réponses comparables. Ce n’est pas une échéance garantie.':'Estimation pas encore fiable sur cet appareil. Première mesure en cours.'):'');
  if(usage.outputTokens)clock.textContent+=' Tokens produits dans les étapes terminées : '+usage.outputTokens+'.';
 }
 function renderWork(){
  const waiting=awaitingWork(state.job);
  work.hidden=!state.job;pause.hidden=!controller;resume.hidden=!!controller||!state.job||state.job.homeProtocol!==HOME_PROTOCOL||waiting;install.hidden=!state.job?.missingModel||!!controller;
  extend.hidden=!!controller||!waiting||state.job?.workControl?.approvedTools>=WORK_BUDGET.maxTools;
  finish.hidden=!!controller||!state.job?.workControl||!state.job?.checkpoint?.answer?.local||!!state.job?.checkpoint?.answer?.draft;
  recover.hidden=!!controller||!state.job||state.job.homeProtocol===HOME_PROTOCOL;
  title.textContent=state.job?(state.job.mode==='deep'?'Travail approfondi':'Conversation')+' · '+(controller?'en cours':waiting?'ton accord est attendu':'à reprendre'):'';
  requestText.textContent=state.job?.text||'';
  const local=state.job?.checkpoint?.answer?.local,bilan=local?workProgress(local):null;
  progress.textContent=waiting&&!controller?bilan.summary+(bilan.recent?'\nDerniers éléments à vérifier : '+bilan.recent:'')+'\nSuite proposée : '+bilan.next+'\nJe continue ? Tu peux autoriser quatre étapes de plus ou demander la réponse maintenant.':stage||state.job?.notice||'Demande conservée. Choisis « Reprendre ce travail » pour continuer. Aucun calcul lancé automatiquement.';
  if(bilan&&!waiting)progress.textContent+='\n'+bilan.summary;
  contextLine.textContent=lastContext?((lastContext.droppedTurns||lastContext.droppedEvidence)?'Pour tenir dans la mémoire du modèle, '+lastContext.droppedTurns+' ancien(s) échange(s) et '+lastContext.droppedEvidence+' élément(s) facultatif(s) ne sont pas utilisés dans cette étape. La demande actuelle reste entière.':'La demande et le contexte sélectionné tiennent dans la mémoire du modèle.'):'Toutes les étapes enregistrées restent sur cet appareil.';
  archive.hidden=!state.archive.length;archiveRows.replaceChildren();
  for(let index=state.archive.length-1;index>=0;index--){
   const old=state.archive[index],row=el('div');row.append(el('p',old.text.slice(0,110)));
   if(old.homeProtocol===HOME_PROTOCOL&&old.model===MODEL.id&&old.modelRevision===MODEL.revision)row.append(button('Sélectionner ce travail conservé',()=>execute(async()=>{
    safe();if(controller)throw Error('Mets le travail en pause avant de changer de demande.');
    const scope=old.context?.toolScope;
    if(scope?.documents){const source=documentsState(await memory.setting(db,DOCUMENTS_KEY));if(await documentSignature(source,scope.selectedId)!==scope.documentSignature)throw Error('Les documents de cette demande ont changé. Recopie sa demande pour utiliser les documents actuels.');}
    await commit(s=>restoreArchivedJob(s,index,{protocol:HOME_PROTOCOL,model:MODEL.id,revision:MODEL.revision}));elapsed=state.job.elapsedMs||0;usage=state.job.usage||{outputTokens:0,generations:0};stage='';lastContext=state.job.contextReport||null;renderWork();status('Point de reprise sélectionné. Aucun calcul lancé ; choisis Reprendre ce travail.');
   })));
   row.append(button('Recopier la demande',()=>onDraft(old.text),'quiet'),button('Exporter cette demande',()=>exportPrivate(old,'aster-demande-privee.json',row),'quiet'),deleteChoice('Retirer cette demande',async()=>{await commit(s=>({archive:s.archive.filter((_,i)=>i!==index)}));renderWork();}));archiveRows.append(row);
  }
  tick();
 }
 function exportPrivate(value,name,row){
  safe();if(archiveURL)URL.revokeObjectURL(archiveURL);archiveURL=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=el('a','Télécharger la copie privée');link.href=archiveURL;link.download=name;row.append(link);
 }
 function deleteChoice(label,remove){
  let confirmed=false;const control=button(label,()=>execute(async()=>{safe();if(controller)throw Error('Mets le travail en pause avant de retirer une archive.');if(!confirmed){confirmed=true;control.textContent='Confirmer le retrait de cet appareil';status('Ce retrait est définitif sur cet appareil. Exporte une copie si tu veux la conserver.');return;}await remove();status('Archive retirée après confirmation.');}),'quiet');return control;
 }
 function renderHistory(){
  historyRows.replaceChildren();history.hidden=!state.history.length;
  for(const entry of state.history){
   const detail=el('details'),messages=el('div');detail.append(el('summary',entry.title+' · '+entry.dialogue.length+' messages'));
   // Render at most 40 entries per click; the saved archive is never shortened.
   let count=0;const more=button('Afficher les messages',()=>{for(const m of entry.dialogue.slice(count,count+40))messages.append(el('p',(m.role==='user'?'Toi : ':'Aster : ')+m.content));count+=40;more.hidden=count>=entry.dialogue.length;more.textContent='Afficher la suite';},'quiet');
   detail.append(messages,more,button('Exporter cette conversation',()=>exportPrivate(entry,'aster-conversation-privee.json',detail),'quiet'),deleteChoice('Retirer cette conversation',async()=>{await commit(s=>{const next={...s,history:s.history.filter(x=>x.id!==entry.id)};return{history:next.history,...preferencePatch(next,next.personal)};});renderHistory();renderWork();}));historyRows.append(detail);
  }
 }
 function archivePatch(current){
  if(!current.job)return current.archive;
  if(current.archive.length>=50)throw Error('50 demandes interrompues sont conservées. Sauvegarde-les avant de commencer un nouveau travail. Aucun élément supprimé.');
  return [...current.archive,{...current.job,archivedAt:new Date().toISOString()}];
 }
 async function accepted(){await onAccepted();renderLog();renderNotes();renderWork();}
 async function immediate(text,answer,personal){
  await commit(s=>({draft:'',dialogue:ensureDialogueCapacity(s.dialogue,[{role:'user',content:text},{role:'assistant',content:answer,source:'LOCAL_COMMAND',savedAt:new Date().toISOString()}]),...(personal?{personal}:{} )}));
  await accepted();status('Échange enregistré sur cet appareil.');
 }
 async function handle(text){
  safe();text=text.trim();if(!text)return;
  if(text.length>HOME_LIMITS.request)throw Error('Pour le dialogue, envoie jusqu’à 4 000 caractères par message. Ton texte reste dans le champ.');
  const continuation=workCommand(text);
  if(state.job&&continuation){
   if(continuation==='finish'&&state.job.workControl){await chooseContinuation('finish',true);return;}
   if(continuation==='continue'){if(awaitingWork(state.job))await chooseContinuation('continue',true);else{await commit(()=>({draft:''}));await accepted();await run();}return;}
  }
  const command=memoryCommand(text);
  if(command){
   // Build the note change inside the same transaction as its confirmation.
   await commit(s=>{const r=applyMemoryCommand(s.personal,command);return{draft:'',...(command.kind==='list'?{personal:r.personal}:preferencePatch(s,r.personal)),dialogue:ensureDialogueCapacity(s.dialogue,[{role:'user',content:text},{role:'assistant',content:r.answer,source:'LOCAL_COMMAND',savedAt:new Date().toISOString()}])};});
   stage='';
   await accepted();status('Mémoire personnelle enregistrée.');return;
  }
  if(/^(?:que peux[- ]tu faire|tes capacites|tes capacités|quels sont tes outils)[ ?.!]*$/i.test(text)){await immediate(text,HOME_CAPABILITIES.map(c=>'• '+c.label+' : '+c.detail).join('\n'));return;}
  let passages=[];const mode=workMode(text,deep.checked);
  if(useDocuments.checked){
   documents=documentsState(await memory.setting(db,DOCUMENTS_KEY));passages=documentContext(documents,text,state.dialogue,documentSelect.value).passages;

  }
  const toolScope={documents:useDocuments.checked,selectedId:documentSelect.value||'',documentSignature:useDocuments.checked?await documentSignature(documents,documentSelect.value||''):null,catalog:useDocuments.checked?documents.documents.filter(d=>!documentSelect.value||d.id===documentSelect.value).map(d=>({id:d.id,title:d.title,characters:d.text.length})):[]};
  await commit(s=>{
   reserveDialogueAnswer(s.dialogue,text);
   const context=dialogueContext(s,text);context.toolScope=toolScope;context.documentsNoMatch=useDocuments.checked&&!passages.length;if(passages.length)context.passages=[...passages.map(x=>({id:x.documentId,title:excerptLabel(x),source:'LOCAL_DOCUMENT',text:x.text})),...context.passages].slice(0,6);
   return {draft:'',archive:archivePatch(s),job:{id:crypto.randomUUID(),homeProtocol:HOME_PROTOCOL,text,mode,...(mode==='deep'?{workControl:initialWorkControl()}:{}),model:MODEL.id,modelRevision:MODEL.revision,context,createdAt:new Date().toISOString(),status:'saved',elapsedMs:0,attempts:0,checkpoint:null}};
  });
  stage='Demande enregistrée.';await accepted();await run();
 }
 async function chooseContinuation(choice,fromComposer=false){
  safe();if(controller)return;
  await commit(s=>({...(fromComposer?{draft:''}:{}),job:{...s.job,workControl:approveWork(s.job,choice),status:'saved',notice:'Choix enregistré.'}}));
  if(fromComposer)await accepted();stage='Choix enregistré.';await run();
 }
 async function run(){
  safe();if(controller||!state.job)return;
  const id=state.job.id;reserveDialogueAnswer(state.dialogue,state.job.text);elapsed=state.job.elapsedMs||0;started=performance.now();estimate=timingEstimate(state.dialogue,state.job.mode,MODEL.id,MODEL.revision);lastContext=state.job.contextReport||null;lastAnswerContext=state.job.answerContextReport||null;controller=new AbortController();
  const previousUsage=state.job.usage||{outputTokens:0,generations:0};usage={...previousUsage};
  const update=change=>commit(s=>{if(s.job?.id!==id)throw Error('La demande active a changé.');return {job:{...s.job,...change}};});
  try{
   await update({status:'running',attempts:(state.job.attempts||0)+1,missingModel:false,notice:'',startedAt:new Date().toISOString()});
   renderWork();renderNotes();work.scrollIntoView({block:'nearest'});timer=setInterval(tick,1000);
   const result=await runHomeDialogue(state.job,{signal:controller.signal,onTool:async action=>{safe();const current=await readLocalState(db);if(current.revision!==state.revision||current.job?.id!==id)throw Error('La conversation a changé pendant le travail.');const source=state.job.context?.toolScope?.documents?documentsState(await memory.setting(db,DOCUMENTS_KEY)):null;return executeLocalTool(action,{scope:state.job.context?.toolScope,documents:source,dialogue:allDialogue(current),forgotten:current.personal.forgotten,forgottenBefore:current.personal.forgottenBefore});},saveCheckpoint:async checkpoint=>{await update({checkpoint,usage,contextReport:lastContext,answerContextReport:lastAnswerContext,elapsedMs:elapsed+performance.now()-started});renderWork();},onProgress:p=>{stage=p.label;progress.textContent=stage;},onUsage:p=>{usage={outputTokens:previousUsage.outputTokens+p.outputTokens,generations:previousUsage.generations+p.generations};tick();},onContext:p=>{lastContext=p;if(/^(Réponse|Correction)/.test(p.label||''))lastAnswerContext=p;renderWork();},onPartial:text=>{partial.hidden=!text;partialText.textContent=text;}});
   if(result.awaitingApproval){if(!state.job?.checkpoint?.answer?.local?.awaitingApproval)throw Error('Point de reprise non confirmé.');await update({status:'awaiting_approval',usage,elapsedMs:elapsed+performance.now()-started,notice:'Ton accord est attendu pour poursuivre.'});stage='';status('Étapes conservées. Choisis de continuer ou de recevoir la réponse maintenant.');return;}
   safe();const wallMs=performance.now()-started,retained=(lastAnswerContext||lastContext)?.retainedSources||[],ids=retained.filter(x=>x.source==='OWNER_VALIDATED_MEMORY').map(x=>x.id);
   await commit(s=>{if(s.job?.id!==id)throw Error('La demande a changé avant l’enregistrement.');return{dialogue:ensureDialogueCapacity(s.dialogue,[{role:'user',content:s.job.text},{role:'assistant',content:result.answer,savedAt:new Date().toISOString(),memoryIds:ids,work:{homeProtocol:HOME_PROTOCOL,mode:s.job.mode,wallMs:elapsed+wallMs,attempts:s.job.attempts,reusedFinal:result.review?.reusedFinal===true,model:MODEL.id,revision:MODEL.revision,sources:retained,excerpts:[...(s.job.context?.passages||[]),...(result.localWork?.receipts||[]).flatMap(r=>r.result.evidence)].filter(p=>p.source==='LOCAL_DOCUMENT'&&retained.some(r=>r.id===p.id&&r.title===p.title)),workControl:s.job.workControl||null,usage,localWork:result.localWork||null,timings:result.timings||null,warning:result.review?.passed===false?'Une contrainte de forme reste à relire. Ce contrôle ne vérifie pas les faits.':null}}]),job:null,learning:recordContextUse(s.learning,ids)};});
   stage='Réponse enregistrée.';status('Réponse enregistrée sur cet appareil.');renderLog();log.lastElementChild?.scrollIntoView({block:'nearest'});
  }catch(e){
   if(!stale){try{await update({status:'paused',notice:e.message,missingModel:e.code==='MODEL_MISSING',usage,elapsedMs:elapsed+performance.now()-started});}catch{stale=true;}}
   stage=stale?'Enregistrement non confirmé. Rouvre la page pour relire le dernier point sûr.':e.message;status(stage,true);
  }finally{clearInterval(timer);timer=null;controller=null;partial.hidden=true;partialText.textContent='';elapsed=state.job?.elapsedMs||0;renderNotes();renderWork();}
 }
 async function download(){
  safe();const report=await cacheReport(),plan=storagePlan(report,await navigator.storage?.estimate?.());
  if(report.complete){status('Modèle déjà installé. Reprends ta demande.');install.hidden=true;return;}
  if(plan.availableBytes!==null&&plan.availableBytes<plan.requiredBytes)throw Error('Espace insuffisant pour installer le modèle. Aucune donnée personnelle n’a été effacée.');
  controller=new AbortController();started=performance.now();elapsed=0;renderNotes();renderWork();stage='Téléchargement du modèle demandé…';progress.textContent=stage;
  const hidden=()=>{if(document.hidden)controller?.abort();};document.addEventListener('visibilitychange',hidden);
  try{await prepareModel(p=>{progress.textContent='Installation · '+(p.message||p.label||Math.round((p.bytes||p.loaded||0)/1000000)+' Mo reçus');},controller.signal);await commit(s=>({job:s.job?{...s.job,missingModel:false,notice:'Modèle installé. Reprends le travail quand tu es prêt.'}:null}));stage='Modèle installé. Tu peux reprendre la demande.';status(stage);}
  finally{document.removeEventListener('visibilitychange',hidden);controller=null;renderNotes();renderWork();}
 }
 function invalidate(){stale=true;controller?.abort();if(exportURL)URL.revokeObjectURL(exportURL);if(archiveURL)URL.revokeObjectURL(archiveURL);}
 renderLog();renderNotes();renderWork();renderDocuments();renderHistory();
 return {handle,acceptsContinuation:text=>!!state.job&&!!workCommand(text),invalidate,pending:()=>!!controller,draft:()=>state.draft,saveDraft:async text=>{if(state.draft!==text)await commit(()=>({draft:text}));},chooseDocument:()=>{safe();if(!controller)importInput.click();},refresh:async()=>{safe();state=await readLocalState(db);elapsed=state.job?.elapsedMs||0;renderLog();renderNotes();renderWork();renderHistory();}};
}
