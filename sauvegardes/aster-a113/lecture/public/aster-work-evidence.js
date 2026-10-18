// A bounded selection of distinct receipts; the full journal remains inspectable.
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export const evidenceKey=e=>e.source+'\n'+norm(e.text);
export function distinctEvidence(receipts=[]){
 const seen=new Set(),out=[];
 for(const receipt of receipts)for(const e of receipt.result.evidence||[]){const key=evidenceKey(e);if(!seen.has(key)){seen.add(key);out.push(e);}}
 return out;
}
export function evidenceProgress(receipts=[]){
 const seen=new Set();let stalled=0;
 for(const r of receipts){let fresh=0;for(const e of r.result.evidence||[]){const key=evidenceKey(e);if(!seen.has(key)){seen.add(key);fresh++;}}stalled=fresh?0:stalled+1;}
 return {unique:seen.size,stalled};
}
export function selectedEvidence(receipts=[],query='',limit=6){
 const q=new Set(norm(query).split(/[^a-z0-9]+/).filter(w=>w.length>3));
 const constraint=e=>/\b(?:budget|plafond|maximum|minimum|deadline|echeance|interdit|obligatoire|imperatif|ne .{0,45} pas)\b/.test(norm(e.text));
 const all=distinctEvidence(receipts).map((e,index)=>({e,index,score:[...q].filter(w=>norm(e.text).includes(w)).length}));
 const pinned=all.filter(x=>constraint(x.e)).slice(0,2),keys=new Set(pinned.map(x=>evidenceKey(x.e)));
 const remaining=all.filter(x=>!keys.has(evidenceKey(x.e))).sort((a,b)=>(b.e.source==='CALCULATOR')-(a.e.source==='CALCULATOR')||b.score-a.score||b.index-a.index);
 return [...pinned,...remaining].slice(0,limit).map(x=>({...x.e,priority:6,required:keys.has(evidenceKey(x.e))||x.e.source==='CALCULATOR'}));
}
