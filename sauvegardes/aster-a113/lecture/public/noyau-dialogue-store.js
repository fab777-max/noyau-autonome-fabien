import {COMPARISON_KEY,comparisonState} from '/aster-comparison-core.js?v=A113';
// Local conversation writes share one revision. Historical data remain readable.
import {learningState} from '/noyau-learning.js?v=A91';
import {personalState} from '/blob-personal-core.js?v=A113';
import {HOME_DRAFT_KEY,homeDraft,validateCorrections} from '/aster-conversation-learning.js?v=A113';
import {validateWorkJob} from '/aster-work-budget.js?v=A113';
export const DIALOGUE_REVISION_KEY='noyau.dialogue-revision.v1';
export const DIALOGUE_LIMITS=Object.freeze({messages:1000,bytes:2*1024*1024});
export const DIALOGUE_HISTORY_KEY='noyau.dialogue-history.v1';
export const ANSWER_RESERVATION_BYTES=384*1024;
const KEYS={comparison:COMPARISON_KEY,history:DIALOGUE_HISTORY_KEY,dialogue:'noyauStandaloneDialogue-v1',job:'noyauStandaloneJob-v1',archive:'noyauStandalonePendingArchive-v1',learning:'noyau.learned-lessons.v1',personal:'assistantPersonal-v1',draft:HOME_DRAFT_KEY,revision:DIALOGUE_REVISION_KEY};
const bytes=v=>new TextEncoder().encode(JSON.stringify(v)).length;
export function dialogueRevision(value){
 if(value==null)return 0;
 if(!Number.isSafeInteger(value)||value<0)throw Error('Compteur de conversation incompatible. Conserve une sauvegarde.');
 return value;
}
export function dialogueRows(value){
 const rows=value??[];
 if(!Array.isArray(rows)||rows.some(m=>!['user','assistant'].includes(m?.role)||typeof m.content!=='string'))throw Error('Historique local incompatible.');
 return validateCorrections(rows);
}
export function dialogueArchive(value){
 const rows=value??[];
 if(!Array.isArray(rows)||rows.length>50||rows.some(m=>typeof m?.text!=='string'||!m.text.trim()||m.text.length>4000))throw Error('Archives de demandes incompatibles.');
 return rows;
}
export function dialogueHistory(value){
 const entries=value??[];
 if(!Array.isArray(entries)||entries.length>3||bytes(entries)>6*1024*1024)throw Error('Archives de conversations pleines ou incompatibles (3 conversations, 6 Mio maximum). Exporte puis retire une archive de ton choix.');
 for(const h of entries){
  if(!h||typeof h.id!=='string'||typeof h.title!=='string'||h.title.length>110||!Number.isFinite(Date.parse(h.at)))throw Error('Archive de conversation incompatible.');
  ensureDialogueCapacity(h.dialogue);
 }
 if(new Set(entries.map(h=>h.id)).size!==entries.length)throw Error('Archive de conversation en double.');
 return entries;
}
export function archiveConversation(state,id,at=new Date().toISOString()){
 if(!state.dialogue.length)throw Error('Cette conversation est déjà vide.');
 if(state.history.length>=3)throw Error('Trois conversations sont déjà archivées. Exporte puis retire une archive de ton choix pour continuer.');
 const entry={id,at,title:(state.dialogue.find(m=>m.role==='user')?.content||'Conversation').slice(0,110),dialogue:state.dialogue};
 return {dialogue:[],history:dialogueHistory([...state.history,entry])};
}
export function restoreArchivedJob(state,index,{protocol,model,revision}){
 const target=state.archive[index];
 if(!target||target.homeProtocol!==protocol||target.model!==model||target.modelRevision!==revision)throw Error('Ancienne demande incompatible avec le modèle courant. Tu peux recopier son texte.');
 validateWorkJob(target);
 const archive=state.archive.filter((_,i)=>i!==index);
 if(state.job)archive.push({...state.job,archivedAt:new Date().toISOString()});
 const job=structuredClone(target);delete job.archivedAt;
 job.status='paused';job.notice='Travail sélectionné avec son point de reprise. Choisis Reprendre pour continuer.';
 return {archive,job};
}
export function ensureDialogueCapacity(rows,extra=[]){
 const next=[...dialogueRows(rows),...dialogueRows(extra)];
 if(extra.some(m=>m.role==='assistant'&&bytes(m)>ANSWER_RESERVATION_BYTES))throw Error('Réponse et journal trop volumineux. Le point de reprise est conservé.');
 if(next.length>DIALOGUE_LIMITS.messages||bytes(next)>DIALOGUE_LIMITS.bytes)throw Error('Conversation pleine (1 000 messages ou 2 Mio). Les échanges restent conservés. Utilise « Archiver cette conversation et continuer » dans « Ce que je retiens », ou sauvegarde ton travail. Aucun échange n’a été effacé.');
 return next;
}
export function reserveDialogueAnswer(rows,text){
 if(typeof text!=='string'||!text.trim()||text.length>4000)throw Error('La demande doit contenir de 1 à 4 000 caractères.');
 // Reserve the whole final record: answer, bounded journal, provenance and excerpts.
 dialogueRows(rows);
 if(rows.length+2>DIALOGUE_LIMITS.messages||bytes(rows)+bytes({role:'user',content:text})+ANSWER_RESERVATION_BYTES+8>DIALOGUE_LIMITS.bytes)throw Error('Conversation pleine ou réserve de réponse insuffisante. Archive cette conversation dans « Ce que je retiens » avant de lancer le calcul. Aucun échange effacé.');
}
function collect(store,done){
 const state={};let pending=Object.keys(KEYS).length;
 for(const [name,key]of Object.entries(KEYS))store.get(key).onsuccess=e=>{state[name]=e.target.result;if(!--pending)done(state);};
}
function normalize(raw){return{comparison:comparisonState(raw.comparison),history:dialogueHistory(raw.history),dialogue:dialogueRows(raw.dialogue),job:raw.job??null,archive:dialogueArchive(raw.archive),learning:learningState(raw.learning),personal:personalState(raw.personal),draft:homeDraft(raw.draft),revision:dialogueRevision(raw.revision)};}
export async function readLocalState(db){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('settings','readonly');let result,error;
  collect(tx.objectStore('settings'),raw=>{try{result=normalize(raw);}catch(e){error=e;tx.abort();}});
  tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(error||tx.error||Error('Lecture de la conversation impossible.'));
 });
}
export async function commitLocalState(db,expected,transform){
 let result,changed;
 const operation=()=>new Promise((resolve,reject)=>{
  const tx=db.transaction('settings','readwrite'),store=tx.objectStore('settings');let error;
  tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(error||tx.error||Error('Conversation non enregistrée.'));
  collect(store,raw=>{try{
   const current=normalize(raw);
   if(expected!==null&&current.revision!==expected)throw Error('Conversation modifiée ou restaurée ailleurs. Rouvre la page ; le travail enregistré reste intact.');
   const patch=transform(structuredClone(current));
   if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!Object.hasOwn(KEYS,k)||k==='revision'))throw Error('Écriture de conversation invalide.');
   if(Object.hasOwn(patch,'dialogue'))ensureDialogueCapacity(patch.dialogue);
   result=normalize({...current,...patch,revision:current.revision+1});
   if(result.job!==null&&(typeof result.job?.text!=='string'||!result.job.text.trim()||result.job.text.length>4000))throw Error('Demande interrompue incompatible.');
   validateWorkJob(result.job);
   changed={...patch,revision:result.revision};
   for(const [name,value]of Object.entries(changed))store.put(value,KEYS[name]);
  }catch(e){error=e;tx.abort();}});
 });
 if(globalThis.navigator?.locks?.request)await navigator.locks.request('noyau-data-maintenance',{mode:'shared'},operation);else await operation();
 const actual=await readLocalState(db);
 if(Object.keys(changed).some(k=>JSON.stringify(actual[k])!==JSON.stringify(result[k])))throw Error('Écriture effectuée mais relecture non confirmée. Aucun calcul suivant lancé. Rouvre la page.');
 return actual;
}
