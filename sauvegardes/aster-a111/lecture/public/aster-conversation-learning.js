// Owner-reviewed examples reuse the existing bounded conversation, never another history.
export const HOME_DRAFT_KEY='noyau.home-draft.v1';
export const CORRECTION_LIMITS=Object.freeze({count:32,text:1200});
export function homeDraft(raw){
 if(raw==null)return null;
 if(typeof raw!=='string'||raw.length>4000)throw Error('Brouillon de conversation incompatible.');
 return raw;
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>new Set(norm(s).split(' ').filter(w=>w.length>3&&!['dans','pour','avec','comment','cette','quoi','faire','peux','voudrais','quand','quelle'].includes(w)));
export function validateCorrections(rows){
 let count=0;
 for(const row of rows||[])if(row.correction!=null){
  const c=row.correction;
  if(row.role!=='assistant'||!c||typeof c.text!=='string'||!c.text.trim()||c.text.length>CORRECTION_LIMITS.text||typeof c.reuse!=='boolean'||typeof c.trainingConsent!=='boolean'||!Number.isFinite(Date.parse(c.at))||c.source!=='OWNER_REVIEWED')throw Error('Correction personnelle incompatible.');
  if(++count>CORRECTION_LIMITS.count)throw Error('32 corrections maximum. Exporte les exemples avant d’en remplacer un.');
 }
 return rows;
}
export function correctedRows(rows,index,text,{reuse=true,trainingConsent=false,at=new Date().toISOString()}={}){
 const next=structuredClone(rows),row=next[index];text=text.trim();
 if(!row||row.role!=='assistant'||next[index-1]?.role!=='user'||row.source==='LOCAL_COMMAND')throw Error('Choisis une réponse du modèle à corriger.');
 if(!text||text.length>CORRECTION_LIMITS.text)throw Error('Ajoute une correction de 1 à 1 200 caractères.');
 row.correction={text,reuse,trainingConsent,at,source:'OWNER_REVIEWED'};
 return validateCorrections(next);
}
export function correctionExamples(rows,query,forgotten=[]){
 validateCorrections(rows);const q=words(query),out=[];
 for(let i=1;i<rows.length;i++){
  const c=rows[i].correction,u=rows[i-1];if(!c?.reuse||u.role!=='user')continue;
  if(forgotten.some(f=>norm(u.content+' '+c.text).includes(f.key)))continue;
  const score=[...words(u.content)].filter(w=>q.has(w)).length;
  if(score&&u.content.length+c.text.length<=850)out.push({id:'correction-'+i,title:'Correction relue',source:'OWNER_CORRECTION',text:'Demande : '+u.content+'\nRéponse corrigée : '+c.text,score});
 }
 return out.sort((a,b)=>b.score-a.score).slice(0,1);
}
export function exportCorrections(rows,at=new Date().toISOString()){
 validateCorrections(rows);
 const examples=[];
 for(let i=1;i<rows.length;i++){
  const c=rows[i].correction,u=rows[i-1];if(!c?.trainingConsent||u.role!=='user')continue;
  const key=JSON.stringify([norm(u.content),norm(c.text)]);if(examples.some(x=>x.key===key))continue;
  examples.push({key,question:u.content,answer:c.text,reviewedAt:c.at,source:'OWNER_REVIEWED',trainingConsent:true});
 }
 return {schema:'aster-reviewed-corrections-v1',createdAt:at,weightsTrained:false,purpose:'Candidates to curate and split before training; not accepted directly by the synthetic pilot.',examples:examples.map(({key,...e})=>e)};
}
