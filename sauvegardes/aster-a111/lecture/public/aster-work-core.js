import {personalNorm} from '/blob-personal-core.js?v=A65.1';
import {searchTerms,searchDocuments,sourceExcerpt,excerptLabel} from '/noyau-documents-core.js?v=A100';

// Read-only local tools. A model can choose a tool, never supply executable code.
export const WORK_LIMITS=Object.freeze({decisions:8,toolResults:6,resultChars:850,checkpointBytes:48000});
const clip=(s,n)=>{let v=String(s).slice(0,n);return /[\uD800-\uDBFF]$/.test(v)?v.slice(0,-1):v;};
export function recalledExchanges(rows,query,forgotten=[],recent=12){
 const words=searchTerms(query).slice(0,32),pairs=[];
 for(let i=0;i<rows.length-1;i++){
  const a=rows[i],b=rows[i+1];
  if(a.role!=='user'||b.role!=='assistant'||b.source==='LOCAL_COMMAND')continue;
  const reply=b.correction?.reuse?b.correction.text:b.content;
  const normalized=personalNorm(a.content+' '+reply);if(forgotten.some(n=>normalized.includes(n.key)))continue;
  pairs.push({a,reply,index:i});
 }
 return pairs.slice(0,Math.max(0,pairs.length-Math.ceil(recent/2))).map(p=>{const terms=new Set(searchTerms(p.a.content+' '+p.reply));return{...p,score:words.filter(w=>terms.has(w)).length};}).filter(p=>p.score>0).sort((a,b)=>b.score-a.score||b.index-a.index).slice(0,2).map(p=>({source:'PAST_CONVERSATION',id:'exchange-'+p.index,title:'Ancien échange '+(p.index+1)+' · propos non vérifiés',text:'Toi : '+clip(p.a.content,330)+'\nAster : '+clip(p.reply,440)}));
}
export async function documentSignature(documents,selectedId=''){
 const data=documents.documents.filter(d=>!selectedId||d.id===selectedId);
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data))))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function workDecision(raw){
 if(typeof raw!=='string'||raw.length>1000)throw Error('WORK_DECISION_INVALID');
 const text=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 let d;try{d=JSON.parse(text);}catch{throw Error('WORK_DECISION_INVALID');}
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('WORK_DECISION_INVALID');
 if(d.tool==='answer')return{tool:'answer'};
 if(['search_documents','recall_conversation'].includes(d.tool)&&typeof d.query==='string'&&d.query.trim()&&d.query.length<=200)return{tool:d.tool,query:d.query.trim()};
 if(d.tool==='read_document'&&typeof d.id==='string'&&d.id.length<=100&&Number.isInteger(d.start)&&d.start>=0&&d.start<24000)return{tool:d.tool,id:d.id,start:d.start};
 if(d.tool==='calculate'&&typeof d.expression==='string'&&d.expression.length<=160&&d.expression.trim())return{tool:d.tool,expression:d.expression.trim()};
 throw Error('WORK_DECISION_INVALID');
}
export function calculateExpression(expression){
 // Decimal arithmetic only: no identifiers, properties, functions, percentages or eval.
 if(typeof expression!=='string'||expression.length>160||!/^[\d\s.,()+*/-]+$/.test(expression))throw Error('Calcul non pris en charge : nombres, parenthèses et + − × ÷ seulement.');
 const source=expression.replace(/,/g,'.'),tokens=source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-]/g)||[];
 if(tokens.length>80||tokens.join('')!==source.replace(/\s/g,''))throw Error('Expression de calcul invalide.');
 let i=0,depth=0;
 const checked=v=>{if(!Number.isFinite(v)||Math.abs(v)>1e15)throw Error('Calcul hors limites.');return v;};
 function atom(){if(++depth>12)throw Error('Calcul trop imbriqué.');let v;const t=tokens[i++];if(t==='+'||t==='-'){v=(t==='-'?-1:1)*atom();}else if(t==='('){v=sum();if(tokens[i++]!==')')throw Error('Parenthèse manquante.');}else if(t!==undefined&&/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)){v=Number(t);}else throw Error('Nombre attendu.');depth--;return checked(v);}
 function product(){let v=atom();while(['*','/'].includes(tokens[i])){const op=tokens[i++],r=atom();if(op==='/'&&r===0)throw Error('Division par zéro.');v=checked(op==='*'?v*r:v/r);}return v;}
 function sum(){let v=product();while(['+','-'].includes(tokens[i])){const op=tokens[i++],r=product();v=checked(op==='+'?v+r:v-r);}return v;}
 const value=sum();if(i!==tokens.length)throw Error('Expression de calcul invalide.');
 return Number(value.toPrecision(12));
}
const documentEvidence=x=>({source:'LOCAL_DOCUMENT',id:x.documentId,title:excerptLabel(x),text:x.text,start:x.start,end:x.end});
export async function executeLocalTool(raw,{scope={},documents,dialogue=[],forgotten=[]}={}){
 const d=workDecision(JSON.stringify(raw));
 if(d.tool==='answer')return{status:'done',evidence:[]};
 if(d.tool==='calculate'){
  try{return{status:'ok',evidence:[{source:'CALCULATOR',id:d.expression,title:'Calcul local · nombres arrondis à 12 chiffres significatifs',text:d.expression+' = '+calculateExpression(d.expression)}]};}
  catch(e){return{status:'unavailable',message:e.message,evidence:[]};}
 }
 if(d.tool==='recall_conversation'){
  const evidence=recalledExchanges(dialogue,d.query,forgotten,0);return{status:evidence.length?'ok':'empty',message:evidence.length?'Anciens propos, pas des faits vérifiés.':'Aucun ancien échange correspondant.',evidence};
 }
 if(scope.documents!==true)return{status:'unavailable',message:'Documents non autorisés pour cette demande.',evidence:[]};
 if(!documents||await documentSignature(documents,scope.selectedId)!==scope.documentSignature)throw Error('Les documents ont changé depuis cette demande. Envoie une nouvelle demande pour utiliser leur version actuelle.');
 const selected=documents.documents.filter(x=>!scope.selectedId||x.id===scope.selectedId);
 if(d.tool==='search_documents'){
  const evidence=searchDocuments({...documents,documents:selected},d.query).slice(0,2).map(documentEvidence);
  return{status:evidence.length?'ok':'empty',evidence,message:evidence.length?'Extraits exacts ; lecture partielle.':'Aucun extrait trouvé.'};
 }
 const doc=selected.find(x=>x.id===d.id);
 if(!doc||d.start>=doc.text.length)return{status:'empty',evidence:[],message:'Document ou position non disponible.'};
 let start=d.start;if(start>0&&/[\uDC00-\uDFFF]/.test(doc.text[start]))start--;
 const evidence=[];for(let n=0;n<2&&start<doc.text.length;n++){let end=Math.min(start+360,doc.text.length);if(/[\uD800-\uDBFF]/.test(doc.text[end-1]))end--;if(doc.text.slice(start,end).trim())evidence.push(documentEvidence(sourceExcerpt(doc,start,end)));start=end;}
 return{status:evidence.length?'ok':'empty',evidence,next:start<doc.text.length?start:null,message:'Lecture partielle. Position suivante : '+(start<doc.text.length?start:'fin du document')+'.'};
}
export function validateToolResult(result){
 if(!result||!['ok','empty','unavailable','done'].includes(result.status)||!Array.isArray(result.evidence)||result.evidence.length>2||JSON.stringify(result).length>2400||result.evidence.some(e=>!e||!['LOCAL_DOCUMENT','CALCULATOR','PAST_CONVERSATION'].includes(e.source)||typeof e.text!=='string'||e.text.length>WORK_LIMITS.resultChars||typeof e.id!=='string'||typeof e.title!=='string'))throw Error('Résultat d’outil local incompatible.');
 return structuredClone(result);
}
