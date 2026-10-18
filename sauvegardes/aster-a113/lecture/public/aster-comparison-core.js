import {HOME_PROTOCOL} from '/aster-conversation-core.js?v=A113';
import {initialWorkControl,validateWorkJob} from '/aster-work-budget.js?v=A113';
import {addDocument} from '/noyau-documents-core.js?v=A100';
import {documentSignature} from '/aster-work-core.js?v=A113';

export const COMPARISON_KEY='aster.comparison.v1';
export const COMPARISON_LIMITS=Object.freeze({bytes:1024*1024,ms:1800000,answers:8});
const stamp='2026-10-18T00:00:00.000Z';
export const COMPARISON_CASES=Object.freeze([
 {id:'conversation',title:'Suivre une conversation',text:'Comment je m’appelle et quelle longueur de réponse est-ce que je préfère ? Réponds en une phrase.',notes:[{text:'Mon prénom est Lina',source:'OWNER'},{text:'Je préfère des réponses courtes.',source:'OWNER'}],history:[{role:'user',content:'Je prépare un atelier pour demain.'},{role:'assistant',content:'Nous pouvons préparer cet atelier ensemble.'}],expected:'Le prénom est Lina et elle préfère des réponses courtes.',anchors:['lina','court']},
 {id:'calcul',title:'Vérifier un calcul',text:'Je commande 37 pièces à 19 euros et 8 pièces à 13 euros. Quel est le total exact ? Montre le calcul puis le total en euros.',expected:'37 × 19 + 8 × 13 = 807 euros.',anchors:['807']},
 {id:'document',title:'Respecter un document',text:'Selon le document Atelier fictif, quel budget maximal et quelle date de livraison faut-il respecter ? Ne les invente pas.',document:'Atelier fictif. Le budget maximal est de 840 euros. La livraison doit avoir lieu le 12 novembre 2026. La proposition de 980 euros dépasse le plafond et doit être refusée.',expected:'Budget maximal : 840 euros. Livraison : 12 novembre 2026. 980 euros dépasse le plafond.',anchors:['840','12','novembre','2026']},
 {id:'incertitude',title:'Signaler une information absente',text:'Quel est le numéro de téléphone de Lina ? Il n’a été communiqué ni dans la conversation ni dans les documents. Réponds honnêtement et brièvement.',notes:[{text:'Mon prénom est Lina',source:'OWNER'}],expected:'Dire que le numéro est inconnu et ne pas en fabriquer. À noter manuellement.',anchors:[]}
]);
export function comparisonState(value){
 if(value==null)return null;
 const s=structuredClone(value),fail=()=>{throw Error('Comparaison locale incompatible. Conserve une copie avant de la remplacer.');};
 if(s.schema!==1||typeof s.model!=='string'||typeof s.revision!=='string'||!Number.isFinite(Date.parse(s.createdAt))||!['paused','running','complete','limited'].includes(s.status)||!Number.isFinite(s.elapsedMs)||s.elapsedMs<0||!Array.isArray(s.results)||s.results.length>8||new TextEncoder().encode(JSON.stringify(s)).length>COMPARISON_LIMITS.bytes)fail();
 const keys=new Set();for(const a of s.results){const key=a.caseId+':'+a.mode;if(!COMPARISON_CASES.some(c=>c.id===a.caseId)||!['direct','deep'].includes(a.mode)||keys.has(key)||typeof a.answer!=='string'||a.answer.length>12000||!Number.isFinite(a.ms)||a.ms<0||!Number.isSafeInteger(a.outputTokens)||a.outputTokens<0||(a.grade!=null&&(!Number.isInteger(a.grade)||a.grade<0||a.grade>5)))fail();keys.add(key);}
 if(s.job){if(!COMPARISON_CASES.some(c=>c.id===s.job.caseId)||s.job.homeProtocol!==HOME_PROTOCOL||s.job.model!==s.model||s.job.modelRevision!==s.revision||!['direct','deep'].includes(s.job.mode)||keys.has(s.job.caseId+':'+s.job.mode))fail();validateWorkJob(s.job);}
 return s;
}
export function newComparison(model,revision,at=new Date().toISOString()){return comparisonState({schema:1,model,revision,createdAt:at,status:'paused',elapsedMs:0,results:[],job:null});}
export function nextComparison(s){
 if(s.job)return{caseId:s.job.caseId,mode:s.job.mode};
 for(let i=0;i<COMPARISON_CASES.length;i++)for(const mode of i%2?['deep','direct']:['direct','deep'])if(!s.results.some(r=>r.caseId===COMPARISON_CASES[i].id&&r.mode===mode))return{caseId:COMPARISON_CASES[i].id,mode};
 return null;
}
export function comparisonDocuments(caseId){const c=COMPARISON_CASES.find(c=>c.id===caseId);return c?.document?addDocument(null,{title:'Atelier fictif',text:c.document},'comparison-document',stamp):null;}
export async function comparisonJob(s,id){
 const next=nextComparison(s);if(!next)return null;const c=COMPARISON_CASES.find(c=>c.id===next.caseId),documents=comparisonDocuments(c.id);
 const toolScope={documents:!!documents,selectedId:documents?'comparison-document':'',documentSignature:documents?await documentSignature(documents,'comparison-document'):null,catalog:documents?documents.documents.map(d=>({id:d.id,title:d.title,characters:d.text.length})):[]};
 const context={localOnly:true,notes:c.notes||[],history:c.history||[],passages:c.document?[{source:'LOCAL_DOCUMENT',id:'comparison-document',title:'Atelier fictif',text:c.document}]:[],toolScope};
 return {...next,id,homeProtocol:HOME_PROTOCOL,text:c.text,model:s.model,modelRevision:s.revision,context,...(next.mode==='deep'?{workControl:initialWorkControl()}:{}),checkpoint:null,usage:{outputTokens:0,generations:0},elapsedMs:0};
}
export function comparisonSummary(s){
 const pairs=COMPARISON_CASES.map(c=>({direct:s.results.find(r=>r.caseId===c.id&&r.mode==='direct'),deep:s.results.find(r=>r.caseId===c.id&&r.mode==='deep')})).filter(p=>p.direct&&p.deep);
 const graded=pairs.filter(p=>p.direct.grade!=null&&p.deep.grade!=null);
 const sum=(rows,mode,key)=>rows.reduce((n,p)=>n+p[mode][key],0);
 return {pairs:pairs.length,graded:graded.length,gradeDelta:graded.length?(sum(graded,'deep','grade')-sum(graded,'direct','grade'))/graded.length:null,directMs:sum(pairs,'direct','ms'),deepMs:sum(pairs,'deep','ms'),directTokens:sum(pairs,'direct','outputTokens'),deepTokens:sum(pairs,'deep','outputTokens')};
}
export function answerAnchors(caseId,answer){const c=COMPARISON_CASES.find(c=>c.id===caseId),text=answer.toLowerCase();return{found:c.anchors.filter(x=>text.includes(x)).length,total:c.anchors.length};}
