import {personalNorm} from '/blob-personal-core.js?v=A65.1';

// Only an explicit owner action can extend this allowance. The model cannot.
export const WORK_PROTOCOL='aster-work-A112';
export const WORK_BUDGET=Object.freeze({chunk:4,maxTools:24,maxDecisions:25,checkpointBytes:96000});
export function workControl(value){
 if(value==null)return null;
 if(value.protocol!==WORK_PROTOCOL||!Number.isInteger(value.approvedTools)||value.approvedTools<4||value.approvedTools>24||value.approvedTools%4||typeof value.finish!=='boolean')throw Error('Budget de travail incompatible. La demande reste conservée.');
 return {protocol:WORK_PROTOCOL,approvedTools:value.approvedTools,finish:value.finish};
}
export const initialWorkControl=()=>({protocol:WORK_PROTOCOL,approvedTools:4,finish:false});
export function awaitingWork(job){
 const local=job?.checkpoint?.answer?.local,control=job?.workControl;
 return !!(control&&!control.finish&&local?.pending&&local.awaitingApproval&&local.receipts.length>=control.approvedTools);
}
export function validateWorkJob(job){
 if(!job?.workControl)return;
 const control=workControl(job.workControl),local=job.checkpoint?.answer?.local;
 if(job.mode!=='deep'||(local&&(!Array.isArray(local.receipts)||local.receipts.length>control.approvedTools||!Number.isInteger(local.decisions)||local.decisions<0||local.decisions>WORK_BUDGET.maxDecisions||new TextEncoder().encode(JSON.stringify(local)).length>WORK_BUDGET.checkpointBytes)))throw Error('Point de reprise du budget incompatible.');
 if(job.usage&&(!Number.isSafeInteger(job.usage.outputTokens)||job.usage.outputTokens<0||!Number.isSafeInteger(job.usage.generations)||job.usage.generations<0))throw Error('Mesure de calcul incompatible.');
}
export function workCommand(text){
 const n=personalNorm(text);
 if(/^(?:(?:oui|ok|d accord) )?(?:continue|continuer|reprends|reprendre|poursuis)(?: (?:ce|le|ton|mon) travail| la recherche)?(?: s il te plait)?$/.test(n))return 'continue';
 if(/^(?:reponds|repondre)(?: moi)? (?:maintenant|avec ce que tu as|avec les elements disponibles)$/.test(n))return 'finish';
 return null;
}
export function nextWorkLabel(action){
 if(action?.tool==='search_documents')return 'Chercher « '+action.query+' » dans les documents autorisés.';
 if(action?.tool==='read_document')return 'Lire le passage suivant du document « '+action.id+' », à partir du caractère '+action.start+'.';
 if(action?.tool==='recall_conversation')return 'Retrouver « '+action.query+' » dans les échanges conservés.';
 if(action?.tool==='calculate')return 'Vérifier le calcul '+action.expression+'.';
 return 'Rédiger avec les éléments disponibles.';
}
export function workProgress(local){
 const receipts=local?.receipts||[],evidence=receipts.flatMap(r=>r.result.evidence||[]),titles=[...new Set(evidence.map(e=>e.title))].slice(-3);
 const recent=evidence.slice(-2).map(e=>String(e.text).slice(0,160)).join(' / ');
 return {completed:receipts.length,found:evidence.length,recent,summary:receipts.length+' étape(s) locale(s) terminée(s), '+evidence.length+' extrait(s) ou résultat(s) obtenu(s).'+(titles.length?' Sources : '+titles.join(' ; ')+'.':''),next:nextWorkLabel(local?.pending)};
}
export function approveWork(job,choice){
 const control=workControl(job?.workControl);
 if(!control||job.mode!=='deep')throw Error('Cette demande ne propose pas de prolongation.');
 if(choice==='finish')return {...control,finish:true};
 if(choice!=='continue'||!awaitingWork(job)||control.approvedTools>=WORK_BUDGET.maxTools)throw Error('Aucune prolongation supplémentaire à autoriser.');
 return {...control,approvedTools:control.approvedTools+WORK_BUDGET.chunk};
}
