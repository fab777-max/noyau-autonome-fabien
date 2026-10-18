import {MODEL} from '/blob-assistant-model.js?v=A83';
import {readLocalState,commitLocalState} from '/noyau-dialogue-store.js?v=A113';
import {COMPARISON_CASES,COMPARISON_LIMITS,newComparison,nextComparison,comparisonJob,comparisonDocuments,comparisonSummary,answerAnchors} from '/aster-comparison-core.js?v=A113';
import {runHomeDialogue} from '/aster-conversation-runner.js?v=A113';
import {executeLocalTool} from '/aster-work-core.js?v=A113';
import {duration} from '/aster-conversation-core.js?v=A113';

const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
let db,state,controller=null,running=false,url=null,stale=false;
const message=text=>{$('comparisonStatus').textContent=text;};
async function commit(fn){if(stale)throw Error('Données modifiées ailleurs. Rouvre cette page pour relire la copie conservée.');state=await commitLocalState(db,state.revision,s=>({comparison:fn(s.comparison)}));return state.comparison;}
function render(){
 const s=state.comparison,available=!!s&&!!nextComparison(s)&&s.elapsedMs<COMPARISON_LIMITS.ms;
 $('comparisonStart').hidden=!!s;$('comparisonResume').hidden=!available;$('comparisonResume').disabled=running;$('comparisonPause').hidden=!running;$('comparisonExport').hidden=!s;$('comparisonExport').disabled=running;
 $('comparisonResults').replaceChildren();$('comparisonSummary').textContent=s?s.results.length+'/8 réponses enregistrées · '+duration(s.elapsedMs)+' de calcul mesuré.':'Aucune mesure effectuée sur cet appareil.';
 if(!s)return;
 const totals=comparisonSummary(s);if(totals.pairs)$('comparisonSummary').textContent+=' Pour '+totals.pairs+' paire(s) complète(s) : direct '+duration(totals.directMs)+', '+totals.directTokens+' tokens produits ; approfondi '+duration(totals.deepMs)+', '+totals.deepTokens+' tokens produits.';
 if(totals.graded)$('comparisonSummary').textContent+=' Sur '+totals.graded+' paire(s) notée(s), écart moyen approfondi − direct : '+totals.gradeDelta.toFixed(1)+'/5. Ce petit échantillon ne permet pas de généraliser.';
 for(const c of COMPARISON_CASES){
  const section=el('section','');section.append(el('h2',c.title),el('p',c.text));
  for(const mode of ['direct','deep']){const a=s.results.find(r=>r.caseId===c.id&&r.mode===mode);if(!a)continue;
   const block=el('article','');block.append(el('h3',mode==='direct'?'Réponse directe':'Réponse approfondie'),el('p',a.answer),el('small',duration(a.ms)+' · '+a.outputTokens+' tokens produits · '+a.tools+' outil(s).'));
   const anchors=answerAnchors(c.id,a.answer);if(anchors.total)block.append(el('p','Repères textuels présents : '+anchors.found+'/'+anchors.total+'. Cela ne vérifie pas le sens de la réponse.'));
   const select=el('select','');select.setAttribute('aria-label','Ta note pour '+c.title+' en mode '+mode);for(const [value,label]of [['','Ta note'],['0','0 · inutilisable'],['1','1'],['2','2'],['3','3 · utile avec corrections'],['4','4'],['5','5 · juste et utile']]){const option=el('option',label);option.value=value;select.append(option);}select.value=a.grade==null?'':String(a.grade);select.disabled=running;
   select.onchange=()=>attempt(async()=>{await commit(current=>({...current,results:current.results.map(r=>r.caseId===c.id&&r.mode===mode?{...r,grade:select.value===''?null:Number(select.value)}:r)}));render();message('Note enregistrée. Aucun apprentissage des poids.');});block.append(select);section.append(block);
  }
  section.append(el('p','Référence de lecture : '+c.expected));$('comparisonResults').append(section);
 }
 if(s.status==='complete')message('Comparaison terminée. Lis les réponses et note leur utilité de 0 à 5.');
 else if(s.elapsedMs>=COMPARISON_LIMITS.ms)message('Budget total de trente minutes atteint. Les mesures partielles restent exportables.');
}
async function attempt(fn){try{await fn();}catch(e){message(e.message);}}
async function run(){
 if(running)return;
 if(!state.comparison||state.comparison.model!==MODEL.id||state.comparison.revision!==MODEL.revision)throw Error('Cette comparaison doit utiliser le même modèle du début à la fin. Reviens au modèle initial pour la reprendre.');
 running=true;controller=new AbortController();const start=performance.now(),baseMs=state.comparison.elapsedMs;
 const remaining=COMPARISON_LIMITS.ms-baseMs;if(remaining<=0){running=false;controller=null;render();return;}
 let activeJobStart=0,activeJobPriorMs=0,activeUsage=null;
 const deadline=setTimeout(()=>controller.abort(),remaining);render();
 try{
  while(nextComparison(state.comparison)){
   controller.signal.throwIfAborted();
   if(!state.comparison.job){const job=await comparisonJob(state.comparison,crypto.randomUUID());await commit(s=>({...s,status:'running',job}));}
   const job=structuredClone(state.comparison.job),jobStart=performance.now(),priorMs=job.elapsedMs||0,priorUsage=job.usage||{outputTokens:0,generations:0};let usage=priorUsage;activeJobStart=jobStart;activeJobPriorMs=priorMs;activeUsage=usage;
   const persist=async patch=>commit(s=>({...s,status:'running',elapsedMs:baseMs+performance.now()-start,job:{...s.job,...patch,usage,elapsedMs:priorMs+performance.now()-jobStart}}));
   const result=await runHomeDialogue(job,{signal:controller.signal,onProgress:p=>message((job.mode==='deep'?'Approfondi':'Direct')+' · '+COMPARISON_CASES.find(c=>c.id===job.caseId).title+' · '+p.label),onUsage:p=>{usage={outputTokens:priorUsage.outputTokens+p.outputTokens,generations:priorUsage.generations+p.generations};activeUsage=usage;},saveCheckpoint:checkpoint=>persist({checkpoint}),onTool:action=>executeLocalTool(action,{scope:job.context.toolScope,documents:comparisonDocuments(job.caseId),dialogue:job.context.history})});
   if(result.awaitingApproval){await persist({workControl:{...job.workControl,finish:true}});continue;}
   await commit(s=>({...s,elapsedMs:baseMs+performance.now()-start,results:[...s.results,{caseId:job.caseId,mode:job.mode,answer:result.answer,ms:priorMs+performance.now()-jobStart,outputTokens:usage.outputTokens,tools:result.localWork?.receipts.length||0,reviewPassed:result.review?.passed===true,grade:null}],job:null}));render();
  }
  await commit(s=>({...s,status:'complete'}));
 }catch(e){try{await commit(s=>({...s,status:baseMs+performance.now()-start>=COMPARISON_LIMITS.ms?'limited':'paused',...(s.job&&activeJobStart?{job:{...s.job,usage:activeUsage,elapsedMs:activeJobPriorMs+performance.now()-activeJobStart}}:{}),elapsedMs:baseMs+performance.now()-start}));}catch{stale=true;}message(stale?'Écriture non confirmée. Rouvre la page pour relire le dernier point conservé.':e.message+' Reprise manuelle.');}
 finally{clearTimeout(deadline);controller=null;running=false;render();}
}
async function init(){
 db=await window.BlobLocalMemory.open();state=await readLocalState(db);render();
 $('comparisonStart').onclick=()=>attempt(async()=>{if(running||state.comparison)return;await commit(()=>newComparison(MODEL.id,MODEL.revision));await run();});
 $('comparisonResume').onclick=()=>attempt(run);$('comparisonPause').onclick=()=>controller?.abort();
 $('comparisonExport').onclick=()=>attempt(async()=>{if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(new Blob([JSON.stringify({scope:'Four synthetic paired cases; human grades; no weight training; partial output-token accounting.',...state.comparison},null,2)],{type:'application/json'}));const a=el('a','Télécharger les mesures privées');a.href=url;a.download='aster-comparaison-privee.json';$('comparisonDownload').replaceChildren(a);});
}
init().catch(e=>message(e.message));
