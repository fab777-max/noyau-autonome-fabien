import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {TestDB} from './memory-double.mjs';
const root=new URL('../public/',import.meta.url),src=n=>fs.readFileSync(new URL(n,root),'utf8'),memo=new Map(),tests=[];
function moduleURL(n){if(!memo.has(n))memo.set(n,'data:text/javascript;base64,'+Buffer.from(src(n).replace(/from ['"]\/([^'"?]+)(?:\?[^'"]*)?['"]/g,(_,f)=>'from '+JSON.stringify(moduleURL(f)))).toString('base64'));return memo.get(n);}
const core=await import(moduleURL('aster-conversation-core.js')),store=await import(moduleURL('noyau-dialogue-store.js')),personal=await import(moduleURL('blob-personal-core.js')),learning=await import(moduleURL('noyau-learning.js')),docs=await import(moduleURL('noyau-documents-core.js')),backup=await import(moduleURL('noyau-backup.js')),budget=await import(moduleURL('blob-context-budget.js'));
async function test(name,fn){try{await fn();tests.push({name,passed:true});}catch(e){tests.push({name,passed:false,error:e.stack});process.exitCode=1;}}
const MODEL={id:'model',revision:'revision',modelBytes:1000000},JOB='noyauStandaloneJob-v1',CHAT='noyauStandaloneDialogue-v1',PERSONAL='assistantPersonal-v1';
const corrections=await import(moduleURL('aster-conversation-learning.js')),documentStore=await import(moduleURL('noyau-documents-store.js'));
const workCore=await import(moduleURL('aster-work-core.js'));
const workBudget=await import(moduleURL('aster-work-budget.js'));
const pipeline=await import(moduleURL('blob-response-pipeline.js'));
const fresh=()=>({dialogue:[],archive:[],personal:personal.personalState(null),learning:learning.learningState(null),revision:0,job:null});
const baseJob=()=>({id:'job1',homeProtocol:core.HOME_PROTOCOL,text:'Compare ces deux idées',mode:'deep',model:MODEL.id,modelRevision:MODEL.revision,context:{localOnly:true},elapsedMs:0,checkpoint:null});
function element(tag='div',all=[]){const e={tagName:tag.toUpperCase(),children:[],value:'',textContent:'',hidden:false,disabled:false,checked:false,attributes:{},className:'',append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=[];this.append(...nodes);},setAttribute(k,v){this.attributes[k]=v;},scrollIntoView(){},get lastElementChild(){return this.children.at(-1);}};all.push(e);return e;}
function uiHarness({db=new TestDB(),run=async(job,{saveCheckpoint,onContext})=>{await saveCheckpoint({answer:{plan:'Comparer les contraintes',final:'Une réponse locale simulée.'}});onContext({inputTokens:120,budget:736,droppedTurns:0,droppedEvidence:0,retainedSources:[]});return{answer:'Une réponse locale simulée.',review:{passed:true}};}}={}){
 const all=[],root=element('section',all),events={},statuses=[],drafts=[],timers=new Map();let accepted=0,calls=0,time=1000,timer=0;
 const c={...core,...store,...personal,...learning,...docs,...corrections,...documentStore,...workCore,...workBudget,Blob,URL,MODEL,console,structuredClone,crypto:webcrypto,Date,Number,String,Error,Promise,AbortController,
  window:{BlobLocalMemory:{setting:async(_,k)=>structuredClone(db.data.settings.get(k))}},document:{createElement:t=>element(t,all),createTextNode:t=>t,addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n],hidden:false},
  navigator:{storage:{estimate:async()=>({quota:1e9,usage:0})}},performance:{now:()=>time},setInterval:fn=>{timers.set(++timer,fn);return timer;},clearInterval:id=>timers.delete(id),
  runHomeDialogue:async(...a)=>{calls++;time+=350;return run(...a);},cacheReport:async()=>({complete:false}),storagePlan:()=>({availableBytes:null}),prepareModel:async()=>{throw Error('Unexpected download');}};
 vm.createContext(c);vm.runInContext(src('aster-conversation-ui.js').replace(/^import .*;\s*$/gm,'').replace('export async function','async function'),c);
 const ready=c.initConversationUI({db,root,execute:fn=>fn(),status:(...a)=>statuses.push(a),onAccepted:async()=>{accepted++;},onDraft:t=>drafts.push(t)});
 return{ready,db,all,root,c,statuses,drafts,get accepted(){return accepted;},get calls(){return calls;},button:s=>all.filter(x=>x.tagName==='BUTTON'&&x.textContent===s).at(-1),text:()=>all.flatMap(x=>[x.textContent,...x.children.filter(y=>typeof y==='string')]).filter(Boolean).join('\n')};
}
function runnerHarness({cached=true,failSave=false,wrongProtocol=false,hidden=false,hold=false,signal,toolRequest=null}={}){
 const workers=[],saved=[],events={},stages=[],contexts=[],partials=[];let released=0,locks=0;
 const c={...workCore,...workBudget,MODEL,MODEL_MODE:'compact',HOME_LIMITS:core.HOME_LIMITS,HOME_PROTOCOL:core.HOME_PROTOCOL,ENGINE_PROTOCOL:'engine',performance,AbortController,Error,Promise,structuredClone,crypto:webcrypto,setTimeout,clearTimeout,
  navigator:{locks:{request(){}}},document:{hidden,addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]},addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n],cacheReport:async()=>({complete:cached}),reserveEngine:async()=>{locks++;return()=>released++;},workerModelOptions:()=>({type:'module'}),
  Worker:class{constructor(){this.sent=[];workers.push(this);}postMessage(m){this.sent.push(m);queueMicrotask(()=>{if(this.dead)return;const emit=data=>this.onmessage({data});if(m.type==='HELLO')emit({type:'HELLO_ACK',nonce:m.nonce,protocol:'engine',homeProtocol:wrongProtocol?'old':core.HOME_PROTOCOL,workProtocol:workBudget.WORK_PROTOCOL,model:MODEL.id,revision:MODEL.revision});if(m.type==='LOAD')emit({type:'READY',model:MODEL.id,revision:MODEL.revision,actual:{n_ctx:4096,n_batch:64,n_threads:1,sliceMs:25,pauseMs:50}});if(m.type==='CHAT'&&!hold){if(toolRequest){emit({type:'TOOL_REQUEST',id:1,jobId:m.jobId,...toolRequest});return;}emit({type:'TECHNICAL',event:'REQUEST_STARTED'});emit({type:'TECHNICAL',event:'FIRST_TOKEN'});emit({type:'PARTIAL',text:'Brouillon reçu'});emit({type:'TECHNICAL',event:'GENERATION_FINISHED',tokens:12});emit({type:'STAGE',label:'Plan en cours',phase:'GENERATE',tokens:3});emit({type:'CONTEXT',retainedSources:[]});emit({type:'CHECKPOINT',id:1,checkpoint:{answer:{plan:'P',final:'F'}}});}if(m.type==='TOOL_RESULT'&&m.ok)emit({type:'CHECKPOINT',id:1,checkpoint:{answer:{final:'F'}}});if(m.type==='CHECKPOINT_ACK'&&m.ok)emit({type:'ANSWER',answer:'F',review:{passed:true}});});}terminate(){this.dead=true;}}
 };
 vm.createContext(c);vm.runInContext(src('aster-conversation-runner.js').replace(/^import .*;\s*$/gm,'').replace('export async function','async function'),c);
 return{workers,saved,events,stages,contexts,partials,get released(){return released;},get locks(){return locks;},run:job=>c.runHomeDialogue(job,{signal,onTool:a=>workCore.executeLocalTool(a),saveCheckpoint:async x=>{if(failSave)throw Error('storage-failure');saved.push(x);},onProgress:x=>stages.push(x),onContext:x=>contexts.push(x),onPartial:x=>partials.push(x)})};
}

await test('questions ordinaires et préférences ne deviennent pas des faits de présentation',()=>{
 for(const text of ['Bonjour, je suis Fabien','Je voudrais discuter de mon entreprise','Comment vas-tu ?','Aide-moi à préparer demain','Retiens que je préfère le français'])assert.equal(core.homeRoute(text),'dialogue');
 assert.equal(core.homeRoute('Comment faire ?', {presentationActive:true}),'dialogue');
 assert.equal(core.homeRoute('Pose de terrasse',{presentationActive:true}),'presentation');
 assert.equal(core.homeRoute('Prépare une présentation de mon atelier'),'start-presentation');
 assert.equal(core.homeRoute('Bonjour',{editing:true}),'presentation');
});
await test('le temps supplémentaire dépend de la tâche ou d’un choix explicite',()=>{
 assert.equal(core.workMode('Salut'),'direct');assert.equal(core.workMode('Compare ces idées'),'deep');assert.equal(core.workMode('Un message',true),'deep');
 assert.equal(core.timingEstimate([], 'deep','m','r'),null);
 const rows=[10000,20000].map(wallMs=>({work:{homeProtocol:core.HOME_PROTOCOL,mode:'deep',model:'m',revision:'r',wallMs}}));assert.equal(core.timingEstimate(rows,'deep','m','r').samples,2);assert.equal(core.timingEstimate(rows,'deep','other','r'),null);
});
await test('notes explicites dédupliquées, bornées, listées et retirables sans effacer l’historique',()=>{
 let s=fresh();for(let i=0;i<32;i++)s.personal=core.applyMemoryCommand(s.personal,{kind:'remember',text:'Préférence '+i+' '+'.'.repeat(450)}).personal;
 assert.throws(()=>core.applyMemoryCommand(s.personal,{kind:'remember',text:'Une autre note'}),/QUOTA/);
 assert.ok(core.applyMemoryCommand(s.personal,{kind:'list'}).answer.length<12000);
 const note=s.personal.notes[0].text;s.personal=core.applyMemoryCommand(s.personal,{kind:'remember',text:note}).personal;assert.equal(s.personal.notes.length,32);
 s.personal=core.applyMemoryCommand(s.personal,{kind:'forget',text:note}).personal;assert.equal(s.personal.notes.length,31);assert.equal(s.personal.forgotten.length,1);
});
await test('une préférence oubliée invalide le contexte et le plan de reprise',()=>{
 const s=fresh();s.personal=personal.rememberPersonalNote(s.personal,'je préfère le rouge');s.job={...baseJob(),checkpoint:{answer:{plan:'rouge'}},context:{notes:s.personal.notes}};
 const changed=core.applyMemoryCommand(s.personal,{kind:'forget',text:'je préfère le rouge'}).personal,p=core.preferencePatch(s,changed);assert.equal(p.job.checkpoint,null);assert.equal(p.job.context.notes.length,0);
 s.dialogue=[{role:'user',content:'je préfère le rouge'},{role:'assistant',content:'Le rouge sera utilisé.'}];assert.equal(core.dialogueContext({...s,personal:changed},'Et ensuite ?').history.length,0);
});
await test('notes et confirmation sont atomiques en cas de quota',async()=>{
 const h=uiHarness();const api=await h.ready;h.db.failAfter=2;await assert.rejects(()=>api.handle('Retiens que je préfère le français'),/quota/);assert.equal(h.db.data.settings.has(PERSONAL),false);assert.equal(h.db.data.settings.has(CHAT),false);assert.equal(h.accepted,0);
});
await test('mémoire sans modèle, réouverture et sauvegarde complète conservent les préférences',async()=>{
 const h=uiHarness(),api=await h.ready;await api.handle('Retiens que je préfère les explications simples');assert.equal(h.calls,0);assert.equal(h.db.data.settings.get(PERSONAL).notes.length,1);
 const restored=new TestDB();await backup.restoreBackup(restored,backup.serializeBackup(await backup.snapshot(h.db)));const h2=uiHarness({db:restored}),api2=await h2.ready;await api2.handle('Que sais-tu de moi ?');assert.match(h2.text(),/explications simples/);assert.equal(h2.calls,0);
});
await test('sauvegarde refuse une note malformée avant toute mutation',async()=>{
 const data=await backup.snapshot(new TestDB());data.settings[PERSONAL]={schema:personal.PERSONAL_SCHEMA,threads:[],notes:[{text:'x',source:'MODEL',at:1}]};assert.throws(()=>backup.validateBackup(data),/NOTE_INVALID/);
});
await test('envoi général : checkpoint puis réponse, même historique que l’espace avancé',async()=>{
 const h=uiHarness(),api=await h.ready;await api.handle('Explique une façon de préparer un projet');assert.equal(h.calls,1);assert.equal(h.db.data.settings.get(CHAT).length,2);assert.equal(h.db.data.settings.get(JOB),null);assert.equal(h.accepted,1);assert.match(h.text(),/Une réponse locale simulée/);
});
await test('réponse basée sur préférences et derniers échanges, sans anciennes affirmations A65',async()=>{
 let received;const h=uiHarness({run:async job=>{received=job;return{answer:'Réponse',review:{passed:true}};}}),api=await h.ready;
 await api.handle('Retiens que je préfère les réponses courtes');await api.handle('Parlons de mon atelier');await api.handle('Et demain ?');assert.equal(received.context.history.length,2);assert.equal(received.context.notes.length,1);assert.equal(received.context.localOnly,true);assert.deepEqual(received.context.facts,{available:false});
});
await test('commande de capacités annonce explicitement les moteurs non actifs',async()=>{
 const h=uiHarness(),api=await h.ready;await api.handle('Que peux-tu faire ?');assert.equal(h.calls,0);assert.match(h.text(),/activation distincte/);assert.match(h.text(),/Non actifs/);
});
await test('demande trop longue, conversation pleine et anciens échanges ne sont pas supprimés',async()=>{
 const h=uiHarness(),api=await h.ready;await assert.rejects(()=>api.handle('x'.repeat(4001)),/4 000/);assert.equal(h.accepted,0);
 const db=new TestDB();db.data.settings.set(CHAT,Array.from({length:1000},(_,i)=>({role:i%2?'assistant':'user',content:'Conserver'})));const h2=uiHarness({db}),a2=await h2.ready;await assert.rejects(()=>a2.handle('Bonjour'),/pleine/);assert.equal(db.data.settings.get(CHAT).length,1000);assert.equal(h2.calls,0);
});
await test('modèle absent : demande durable, installation explicite et aucun lancement à la réouverture',async()=>{
 const h=uiHarness({run:async()=>{throw Object.assign(Error('Modèle absent'),{code:'MODEL_MISSING'});}}),api=await h.ready;await api.handle('Bonjour');assert.equal(h.db.data.settings.get(JOB).missingModel,true);assert.equal(h.db.data.settings.get(CHAT),undefined);assert.equal(h.button('Installer le modèle · 1 Mo').hidden,false);
 const h2=uiHarness({db:h.db});await h2.ready;assert.equal(h2.calls,0);assert.equal(h2.button('Reprendre ce travail').hidden,false);
});
await test('une nouvelle demande conserve la précédente et refuse la 51e archive',async()=>{
 const h=uiHarness({run:async()=>{throw Error('Pause');}}),api=await h.ready;await api.handle('Travail un');await api.handle('Travail deux');assert.equal(h.db.data.settings.get('noyauStandalonePendingArchive-v1')[0].text,'Travail un');
 const db=new TestDB();db.data.settings.set(JOB,baseJob());db.data.settings.set('noyauStandalonePendingArchive-v1',Array.from({length:50},()=>({text:'Conservé'})));const h2=uiHarness({db}),a2=await h2.ready;await assert.rejects(()=>a2.handle('Autre travail'),/50 demandes/);assert.equal(db.data.settings.get(JOB).id,'job1');
});
await test('restauration pendant calcul : aucune réponse tardive ne remplace les données',async()=>{
 let api;const h=uiHarness({run:async()=>{const newer=await backup.snapshot(h.db);newer.settings[CHAT]=[{role:'assistant',content:'Restauré'}];await backup.restoreBackup(h.db,backup.serializeBackup(newer));return{answer:'Réponse ancienne'};}});api=await h.ready;await api.handle('Ancienne demande');assert.equal(h.db.data.settings.get(CHAT)[0].content,'Restauré');assert.equal(h.db.data.settings.get(CHAT).length,1);
});
await test('lecture des méthodes actuelles au commit, sans écraser une méthode ajoutée pendant le calcul',async()=>{
 const h=uiHarness({run:async(_job,{onContext})=>{h.db.data.settings.set(learning.LEARNING_KEY,learning.retainLesson(null,'Parlons de mon atelier','Une méthode','method1'));onContext({retainedSources:[{source:'OWNER_VALIDATED_MEMORY',id:'method1'}]});return{answer:'Réponse'};}}),api=await h.ready;await api.handle('Parlons de mon atelier');const s=h.db.data.settings.get(learning.LEARNING_KEY);assert.equal(s.lessons.length,1);assert.equal(s.contextUses,1);
});
await test('documents locaux recherchés seulement après sélection explicite, passages traçables',async()=>{
 let received;const h=uiHarness({run:async job=>{received=job;return{answer:'Réponse'};}});h.db.data.settings.set(docs.DOCUMENTS_KEY,docs.addDocument(null,{title:'Projet','text':'Le budget prévu du projet est de cinquante unités.'},'doc1'));
 const api=await h.ready;await api.handle('Quel budget pour mon projet ?');assert.equal(received.context.passages.length,0);
 h.all.filter(e=>e.tagName==='INPUT')[1].checked=true;await api.handle('Quel budget pour mon projet ?');assert.equal(received.context.passages[0].source,'LOCAL_DOCUMENT');assert.match(received.context.passages[0].title,/lignes/);
});
await test('absence de passage correspondant ne fabrique pas une lecture documentaire',async()=>{
 const h=uiHarness(),api=await h.ready;h.all.filter(e=>e.tagName==='INPUT')[1].checked=true;await api.handle('Quel est le budget ?');assert.equal(h.calls,0);assert.match(h.text(),/Aucun passage correspondant/);
});
await test('calibrage du vrai prompt conserve la demande et signale les retraits facultatifs',async()=>{
 const messages=[{role:'system',content:'Aster',evidence:[{source:'OWNER',text:'x'.repeat(1000),priority:5}]},{role:'user',content:'Historique'.repeat(300)},{role:'assistant',content:'Ancienne réponse'},{role:'user',content:'Demande actuelle entière',required:true}];
 const r=await budget.fitDialogueContext(messages,s=>Array.from(s),30,200);assert.match(r.text,/Demande actuelle entière/);assert(r.droppedEvidence>0&&r.droppedTurns>0);await assert.rejects(()=>budget.fitDialogueContext([{role:'user',content:'x'.repeat(1000),required:true}],s=>Array.from(s),30,100),/CONTEXT_TOO_LONG/);
});
await test('runner réel : protocole, modèle local, un Worker, ACK après sauvegarde et libération',async()=>{
 const h=runnerHarness(),r=await h.run(baseJob());assert.equal(r.answer,'F');assert.equal(h.workers.length,1);assert.equal(h.saved.length,1);const sent=h.workers[0].sent;assert.equal(sent.find(x=>x.type==='CHAT').localLearning,false);assert.equal(sent.find(x=>x.type==='LOAD').homeProtocol,core.HOME_PROTOCOL);assert.equal(sent.find(x=>x.type==='CHECKPOINT_ACK').ok,true);assert.equal(h.released,1);assert(h.workers[0].dead);assert(h.stages.some(s=>s.label==='Plan en cours'));
});
await test('runner refuse ancien protocole et modèle absent sans téléchargement',async()=>{
 const h=runnerHarness({wrongProtocol:true});await assert.rejects(()=>h.run(baseJob()),/Mise à jour/);assert.equal(h.released,1);const h2=runnerHarness({cached:false});await assert.rejects(()=>h2.run(baseJob()),/installé/);assert.equal(h2.workers.length,0);assert.equal(h2.locks,0);
});
await test('échec du checkpoint bloque ACK positif et résultat',async()=>{
 const h=runnerHarness({failSave:true});await assert.rejects(()=>h.run(baseJob()),/storage-failure/);assert.equal(h.workers[0].sent.some(m=>m.type==='CHECKPOINT_ACK'&&m.ok),false);assert.equal(h.released,1);
});
await test('page cachée ou pause explicite arrêtent le Worker et libèrent la réservation',async()=>{
 const hidden=runnerHarness({hidden:true});await assert.rejects(()=>hidden.run(baseJob()),/pause/);assert.equal(hidden.workers.length,0);
 const ac=new AbortController(),h=runnerHarness({hold:true,signal:ac.signal}),pending=h.run(baseJob());await new Promise(r=>setImmediate(r));ac.abort();await assert.rejects(()=>pending,/pause/);assert.equal(h.released,1);assert(h.workers[0].dead);
});
await test('pipeline approfondi réel : le plan est requis dans la réponse, jamais silencieusement évincé',async()=>{
 let calls=0,last,seen;const data={homeProtocol:'aster-home-dialogue-A110',text:'Prépare un plan simple',mode:'deep',context:{localOnly:true}},messages=[{role:'user',content:data.text,required:true}];
 const result=await pipeline.runAnswerPipeline(data,messages,{model:MODEL,generate:async m=>{calls++;seen=m;return calls===1?'Recueillir les contraintes. Comparer. Proposer.':'Une proposition à relire.';},save:async x=>{last=structuredClone(x);return true;}});
 assert.equal(calls,2);assert(seen.some(m=>m.role==='assistant'&&m.required===true&&/Recueillir/.test(m.content)));assert.equal(result.answer,'Une proposition à relire.');
 const resumed=await pipeline.runAnswerPipeline({...data,checkpoint:last},messages,{model:MODEL,generate:async()=>{throw Error('Génération inutile');},save:async()=>true});assert.equal(resumed.review.reusedFinal,true);
});
await test('pipeline interrompu après plan : une reprise calcule seulement la réponse manquante',async()=>{
 const data={homeProtocol:'aster-home-dialogue-A110',text:'Prépare un plan simple',mode:'deep',context:{localOnly:true}},messages=[{role:'user',content:data.text,required:true}];let last,calls=0;
 await assert.rejects(()=>pipeline.runAnswerPipeline(data,messages,{model:MODEL,generate:async()=>{if(++calls===2)throw Error('pause');return 'Plan utile';},save:async x=>{last=structuredClone(x);return true;}}),/pause/);
 let resumed=0;await pipeline.runAnswerPipeline({...data,checkpoint:last},messages,{model:MODEL,generate:async()=>{resumed++;return 'Voici une proposition à relire.';},save:async()=>true});assert.equal(resumed,1);
});
await test('pipeline refuse les fausses déclarations persistantes après au plus une correction',async()=>{
 let calls=0;await assert.rejects(()=>pipeline.runAnswerPipeline({homeProtocol:core.HOME_PROTOCOL,text:'Qui es-tu ?',context:{localOnly:true}},[{role:'user',content:'Qui es-tu ?'}],{model:MODEL,generate:async()=>{calls++;return 'Je suis Claude.';},save:async()=>true}),/REJECTED/);assert.equal(calls,2);
});
await test('brouillon de discussion isolé et sauvegardé sans créer de projet photo',async()=>{
 const h=uiHarness(),api=await h.ready;assert.equal(api.draft(),null);await api.saveDraft('Je veux parler de mes objectifs');assert.equal(h.db.data.settings.has('noyau.workshop.v1'),false);
 const restored=new TestDB();await backup.restoreBackup(restored,backup.serializeBackup(await backup.snapshot(h.db)));const h2=uiHarness({db:restored}),a2=await h2.ready;assert.equal(a2.draft(),'Je veux parler de mes objectifs');await a2.handle('Bonjour');assert.equal(a2.draft(),'');
});
await test('correction choisie : original conservé, relance corrigée et réemploi seulement pertinent',()=>{
 let s=fresh();s.dialogue=corrections.correctedRows([{role:'user',content:'Quel budget pour une terrasse ?'},{role:'assistant',content:'Une réponse à corriger.'}],1,'Le budget exige les dimensions et les matériaux.');
 assert.equal(s.dialogue[1].content,'Une réponse à corriger.');assert.match(core.dialogueContext(s,'Et ensuite ?').history[1].content,/dimensions/);
 assert.equal(corrections.correctionExamples(s.dialogue,'Quel budget prévoir ?').length,1);assert.equal(corrections.correctionExamples(s.dialogue,'Que dit la météo ?').length,0);
 s.dialogue[1].correction.reuse=false;assert.equal(corrections.correctionExamples(s.dialogue,'Quel budget prévoir ?').length,0);assert.equal(core.dialogueContext(s,'Ensuite').history[1].content,'Une réponse à corriger.');
});
await test('exemples de futur entraînement : consentement explicite, dédoublonnage et plafond',()=>{
 const rows=corrections.correctedRows([{role:'user',content:'Question test'},{role:'assistant',content:'Ancienne réponse'}],1,'Réponse relue');assert.equal(corrections.exportCorrections(rows).examples.length,0);
 rows[1].correction.trainingConsent=true;assert.equal(corrections.exportCorrections([...rows,...rows]).examples.length,1);assert.equal(corrections.exportCorrections(rows).weightsTrained,false);
 assert.throws(()=>corrections.correctedRows(rows,1,'x'.repeat(1201)),/1 200/);assert.throws(()=>corrections.validateCorrections(Array(33).fill(rows).flat()),/32 corrections/);
});
await test('correction oubliée ne revient ni par l’historique ni par les exemples',()=>{
 let s=fresh();s.dialogue=corrections.correctedRows([{role:'user',content:'Quel est mon choix ?'},{role:'assistant',content:'Je ne sais pas.'}],1,'Je préfère le rouge');s.personal=personal.rememberPersonalNote(s.personal,'Je préfère le rouge');s.personal=core.applyMemoryCommand(s.personal,{kind:'forget',text:'Je préfère le rouge'}).personal;
 const c=core.dialogueContext(s,'Mon choix rouge ?');assert.equal(c.history.length,0);assert.equal(c.passages.length,0);
});
await test('éditeur de correction : transaction, reprise invalidée, sauvegarde complète et rejet avant mutation',async()=>{
 const h=uiHarness(),api=await h.ready;await api.handle('Quel budget pour le projet ?');
 const textarea=h.all.filter(e=>e.attributes['aria-label']==='Ta réponse corrigée').at(-1);textarea.value='Il faut connaître les dimensions du projet.';await h.button('Enregistrer ma correction').onclick();assert.equal(h.db.data.settings.get(CHAT)[1].correction.reuse,true);assert.equal(h.db.data.settings.get(CHAT)[1].correction.trainingConsent,false);
 const b=await backup.snapshot(h.db),restored=new TestDB();await backup.restoreBackup(restored,backup.serializeBackup(b));assert.equal(restored.data.settings.get(CHAT)[1].correction.text,textarea.value);
 b.settings[CHAT][1].correction.source='MODEL';assert.throws(()=>backup.validateBackup(b),/Correction personnelle/);
 const s=await store.readLocalState(h.db);s.job={...baseJob(),checkpoint:{answer:{plan:'Ancien'}}};assert.equal(core.preferencePatch(s,s.personal).job.checkpoint,null);
});
await test('restauration refuse un brouillon malformé ; quota garde le précédent',async()=>{
 const h=uiHarness(),api=await h.ready;await api.saveDraft('Conserver');h.db.failAfter=1;await assert.rejects(()=>api.saveDraft('Remplacer'),/quota/);assert.equal(h.db.data.settings.get(corrections.HOME_DRAFT_KEY),'Conserver');
 h.db.failAfter=null;const b=await backup.snapshot(h.db);b.settings[corrections.HOME_DRAFT_KEY]={text:'non'};assert.throws(()=>backup.validateBackup(b),/Brouillon de conversation/);
});
await test('question documentaire longue et relance utilisent les bons mots, sans troncature du document',()=>{
 const ds=docs.addDocument(null,{title:'Atelier','text':'Le budget de la terrasse est de 250 unités. Les matériaux restent à choisir.'},'d');
 assert(core.documentContext(ds,'Dans ce projet '.repeat(20)+'quel budget pour la terrasse ?').passages.length);
 assert(core.documentContext(ds,'Et pourquoi ?',[{role:'user',content:'Quel budget pour la terrasse ?'}]).passages.length);
 assert.equal(core.documentContext(ds,'Astronomie distante').passages.length,0);
});
await test('résumé du fichier choisi borné à deux extraits, annoncé partiel, aucun caractère Unicode cassé',()=>{
 const ds=docs.addDocument(null,{title:'Notes','text':'a'.repeat(359)+'😀'+' b'.repeat(600)},'d'),r=core.documentContext(ds,'Résume ce fichier',[],'d');assert.equal(r.passages.length,2);assert.equal(r.partial,true);assert(r.passages.every(x=>x.text.length<=360&&!/[\uD800-\uDBFF]$/.test(x.text)));
 assert.match(core.homeMessages('Résume ce fichier',{passages:r.passages.map(x=>({source:'LOCAL_DOCUMENT',text:x.text}))})[0].content,/par extraits/);
});
await test('import depuis la conversation : exact, sélectionné, doublon rejeté et aucun appel modèle à l’import',async()=>{
 const h=uiHarness();await h.ready;const input=h.all.find(e=>e.type==='file');input.files=[new File(['La livraison du projet est prévue en novembre.'],'projet.txt',{type:'text/plain'})];await input.onchange();const ds=h.db.data.settings.get(docs.DOCUMENTS_KEY);assert.equal(ds.documents[0].text,'La livraison du projet est prévue en novembre.');assert.equal(h.calls,0);
 input.files=[new File([ds.documents[0].text],'copie.md')];await assert.rejects(()=>input.onchange(),/déjà conservé/);assert.equal(h.db.data.settings.get(docs.DOCUMENTS_KEY).documents.length,1);
});
await test('contexte compact : dernière paire prioritaire sur une source facultative trop longue',async()=>{
 const m=[{role:'system',content:'Aster',compactEvidence:true,preferRecent:true,evidence:[{source:'OPTION',text:'X'.repeat(200),priority:1}]},{role:'user',content:'Le devis terrasse'},{role:'assistant',content:'Choisissons les matériaux.'},{role:'user',content:'Et ensuite ?',required:true}];
 const r=await budget.fitDialogueContext(m,s=>Array.from(s),20,280);assert.equal(r.droppedTurns,0);assert.equal(r.droppedEvidence,1);assert.match(r.text,/devis terrasse/);
});
await test('source documentaire requise conservée ; trop grande déclenche une limite visible',async()=>{
 const m=[{role:'system',content:'Aster',compactEvidence:true,preferRecent:true,evidence:[{source:'LOCAL_DOCUMENT',text:'Preuve requise',required:true}]},{role:'user',content:'Question entière',required:true}];
 assert.match((await budget.fitDialogueContext(m,s=>Array.from(s),20,300)).text,/Preuve requise/);m[0].evidence[0].text='X'.repeat(1000);await assert.rejects(()=>budget.fitDialogueContext(m,s=>Array.from(s),20,300),/CONTEXT_TOO_LONG/);
});
await test('sortie progressive reste provisoire, disparaît après échec et ne devient jamais une réponse enregistrée',async()=>{
 let seen;const h=uiHarness({run:async(_job,{onPartial})=>{onPartial('Brouillon provisoire');seen=h.all.find(e=>e.className==='conversation-partial');assert.equal(seen.hidden,false);throw Error('Pause après sortie');}}),api=await h.ready;
 await api.handle('Bonjour');assert.equal(seen.hidden,true);assert.equal(h.db.data.settings.get(CHAT),undefined);assert.equal(h.db.data.settings.get(JOB).status,'paused');
});
await test('runner : mesures et brouillon transmis depuis les événements du Worker',async()=>{
 const h=runnerHarness(),r=await h.run(baseJob());assert.equal(r.timings.outputTokens,12);assert.equal(r.timings.generations,1);assert(r.timings.loadMs>=0&&r.timings.firstTokenMs>=0);assert.deepEqual(h.partials,['','Brouillon reçu']);
});
await test('Worker réel : contrat du troisième argument wllama et plan non diffusé comme réponse',async()=>{
 const output=[],c=vm.createContext({self:{postMessage:p=>output.push(p)},PROFILES:[{sliceMs:0,pauseMs:0}],fitDialogueContext:budget.fitDialogueContext,performance,setInterval,clearInterval,Error,Map,Promise});
 vm.runInContext(src('blob-assistant-worker.js').replace(/^import .*;\s*$/gm,'')+'\nglobalThis.attach=g=>generator=g;',c);
 c.attach({getLoadedContextInfo:()=>({n_ctx:1024}),tokenize:async()=>[1,2,3],createCompletion:async(_text,options)=>{options.onNewToken(1,new Uint8Array(),'Bonjour');return 'Bonjour';}});
 await c.generate([{role:'user',content:'Salut'}],32,'Réponse directe');assert.equal(output.find(p=>p.type==='PARTIAL').text,'Bonjour');output.length=0;await c.generate([{role:'user',content:'Salut'}],32,'Plan');assert.equal(output.some(p=>p.type==='PARTIAL'),false);
});

await test('message de 4 000 caractères conservé, sauvegardé et transmis sans coupe',async()=>{
 let received;const h=uiHarness({run:async j=>{received=j;return{answer:'Message reçu.'};}}),api=await h.ready;
 const text='Un projet détaillé. '.repeat(200).trim();assert(text.length>1000&&text.length<=4000);
 await api.saveDraft(text);await api.handle(text);assert.equal(received.text,text);assert.equal(core.homeMessages(text)[1].content,text);
 const b=await backup.snapshot(h.db);assert.equal(backup.validateBackup(b).settings[CHAT][0].content,text);
});
await test('les trois phrases de discussion de l’audit ne modifient plus un projet ouvert',()=>{
 for(const text of ['Je trouve ton idée intéressante, mais je ne suis pas convaincu.','Ça ne me plaît pas, discutons d’autre chose.','J’aimerais que tu te souviennes que je préfère les réponses courtes.'])assert.equal(core.homeRoute(text,{presentationActive:true}),'dialogue');
 assert.equal(core.homeRoute('Change le titre en Bonjour',{fieldCommand:true,presentationActive:true}),'presentation');
});
await test('préférence naturelle enregistrée atomiquement, jamais seulement affirmée par le modèle',async()=>{
 const h=uiHarness(),api=await h.ready;await api.handle('J’aimerais que tu te souviennes que je préfère les réponses courtes.');assert.equal(h.calls,0);assert.equal(h.db.data.settings.get(PERSONAL).notes.length,1);assert.match(h.db.data.settings.get(PERSONAL).notes[0].text,/réponses courtes/);
});
await test('douze messages récents et souvenir pertinent ancien, sans seconde histoire ni fait inventé',()=>{
 const s=fresh();s.dialogue=[{role:'user',content:'Mon bateau se nomme Libellule.'},{role:'assistant',content:'Tu as choisi Libellule pour ton bateau.'}];
 for(let i=0;i<10;i++)s.dialogue.push({role:'user',content:'Autre sujet '+i},{role:'assistant',content:'Discussion '+i});
 const c=core.dialogueContext(s,'Quel nom pour mon bateau ?');assert.equal(c.history.length,12);assert.equal(c.passages[0].source,'PAST_CONVERSATION');assert.match(c.passages[0].text,/Libellule/);assert.equal(s.dialogue.length,22);
 assert.equal(workCore.recalledExchanges(s.dialogue,'bateau',[{key:'mon bateau'}],0).length,0);
});
await test('calcul déterministe, décimales, précédence, bornes et refus de toute exécution de code',()=>{
 for(const [e,r]of [['(12+3)*2',30],['-3+2*4',5],['1,5*4',6],['0.1+0.2',.3],['(40-4)/3',12]])assert.equal(workCore.calculateExpression(e),r);
 for(const e of ['fetch("/x")','globalThis','2**999','1/0','1e9','1;2','1 2','(2','2%3','9999999999999999'])assert.throws(()=>workCore.calculateExpression(e));
});
await test('outils : aucune lecture de document sans autorisation et sélection respectée',async()=>{
 let ds=docs.addDocument(null,{title:'A','text':'La quantité est de 12 pièces.'},'a');ds=docs.addDocument(ds,{title:'B','text':'La quantité privée est de 999 pièces.'},'b');
 assert.equal((await workCore.executeLocalTool({tool:'search_documents',query:'quantité'},{documents:ds})).status,'unavailable');
 const scope={documents:true,selectedId:'a',documentSignature:await workCore.documentSignature(ds,'a')};
 const r=await workCore.executeLocalTool({tool:'search_documents',query:'quantité'},{scope,documents:ds});assert.equal(r.evidence.length,1);assert.equal(r.evidence[0].id,'a');assert.match(r.evidence[0].text,/12 pièces/);
 assert.equal((await workCore.executeLocalTool({tool:'read_document',id:'b',start:0},{scope,documents:ds})).status,'empty');
 const changed=structuredClone(ds);changed.documents[0].text='Autre donnée';await assert.rejects(()=>workCore.executeLocalTool({tool:'read_document',id:'a',start:0},{scope,documents:changed}),/ont changé/);
});
await test('lecture successive exacte et bornée, même au milieu d’un caractère Unicode',async()=>{
 const ds=docs.addDocument(null,{title:'Suite','text':'A'.repeat(359)+'😀'+' Suite importante. '.repeat(80)},'doc');const scope={documents:true,selectedId:'doc',documentSignature:await workCore.documentSignature(ds,'doc')};
 const r=await workCore.executeLocalTool({tool:'read_document',id:'doc',start:360},{scope,documents:ds});assert.equal(r.evidence[0].start,359);assert(r.evidence.every(e=>e.text===ds.documents[0].text.slice(e.start,e.end)&&e.text.length<=360));assert(r.next>360);workCore.validateToolResult(r);
});
await test('circuit adaptatif : recherche réelle, calcul réel, réponse, critique, reprise sans recalcul',async()=>{
 const ds=docs.addDocument(null,{title:'Commande','text':'Nous livrons 12 pièces à 7 unités chacune.'},'d');const scope={documents:true,selectedId:'d',documentSignature:await workCore.documentSignature(ds,'d'),catalog:[{id:'d',title:'Commande',characters:ds.documents[0].text.length}]};
 const data={...baseJob(),text:'Quel est le total de la commande ?',context:{localOnly:true,toolScope:scope}},messages=core.homeMessages(data.text,data.context);let decisions=0,calls=0,toolCalls=0,last;
 const result=await pipeline.runAnswerPipeline(data,messages,{model:MODEL,generate:async(m,n,label)=>{calls++;if(label==='Choix de la prochaine étape')return JSON.stringify([{tool:'search_documents',query:'pièces'},{tool:'calculate',expression:'12*7'},{tool:'answer'}][decisions++]);if(label==='Relecture critique')return 'OK';assert.equal(n,768);assert(m[0].evidence.some(e=>e.source==='CALCULATOR'&&e.text==='12*7 = 84'));return 'Le total est de 84 unités, pour douze pièces à sept unités chacune.';},tool:async a=>{toolCalls++;return workCore.executeLocalTool(a,{scope,documents:ds});},save:async x=>{last=structuredClone(x);return true;}});
 assert.equal(calls,5);assert.equal(toolCalls,2);assert.equal(result.localWork.receipts.length,2);assert.match(result.answer,/84 unités/);assert.equal(result.review.criticalReview,true);
 const replay=await pipeline.runAnswerPipeline({...data,checkpoint:last},messages,{model:MODEL,generate:async()=>{throw Error('Calcul indu');},tool:async()=>{throw Error('Lecture indue');},save:async()=>true});assert.equal(replay.review.reusedFinal,true);assert.equal(replay.localWork.receipts.length,2);
});
await test('décision malformée ou outil interdit : aucune action, réponse avec les éléments connus',async()=>{
 for(const decision of ['Un long plan sans JSON','{"tool":"execute","code":"alert(1)"}']){
  let calls=0;const d=baseJob(),r=await pipeline.runAnswerPipeline(d,core.homeMessages(d.text),{model:MODEL,generate:async(_m,_n,l)=>{calls++;return l==='Choix de la prochaine étape'?decision:l==='Relecture critique'?'OK':'Voici deux options à comparer.';},tool:async()=>{throw Error('Outil interdit exécuté');},save:async()=>true});assert.equal(calls,3);assert.equal(r.localWork.receipts.length,0);assert.match(r.localWork.stop,/non exploitable/);
 }
});
await test('recherche répétée arrêtée et huit recherches au maximum, pas de boucle pour remplir le temps',async()=>{
 for(const repeat of [true,false]){
  let decisions=0,tools=0;const d=baseJob(),r=await pipeline.runAnswerPipeline(d,core.homeMessages(d.text),{model:MODEL,generate:async(_m,_n,l)=>{if(l==='Choix de la prochaine étape')return JSON.stringify({tool:'recall_conversation',query:repeat?'bateau':'sujet '+(++decisions)});return l==='Relecture critique'?'OK':'Voici une réponse avec les limites des informations disponibles.';},tool:async()=>{tools++;return{status:'empty',evidence:[],message:'Aucun résultat.'};},save:async()=>true});assert.equal(tools,repeat?1:8);assert.match(r.localWork.stop,repeat?/répétée/:/huit/);
 }
});
await test('interruption après choix : reprise de l’outil choisi sans régénérer sa décision',async()=>{
 const d=baseJob(),m=core.homeMessages(d.text);let last,first=0;
 await assert.rejects(()=>pipeline.runAnswerPipeline(d,m,{model:MODEL,generate:async()=>{first++;return '{"tool":"calculate","expression":"7*8"}';},tool:async()=>{throw Error('Pause outil');},save:async x=>{last=structuredClone(x);return true;}}),/Pause outil/);assert.equal(first,1);assert.equal(last.answer.local.pending.tool,'calculate');
 let decisions=0;const r=await pipeline.runAnswerPipeline({...d,checkpoint:last},m,{model:MODEL,generate:async(_m,_n,l)=>{if(l==='Choix de la prochaine étape'){decisions++;return '{"tool":"answer"}';}return l==='Relecture critique'?'OK':'Le résultat de ce calcul est 56.';},tool:a=>workCore.executeLocalTool(a),save:async()=>true});assert.equal(decisions,1);assert.match(r.localWork.receipts[0].result.evidence[0].text,/56/);
});
await test('échec de sauvegarde avant outil : zéro lecture ou calcul lancé',async()=>{
 let tools=0;const d=baseJob();await assert.rejects(()=>pipeline.runAnswerPipeline(d,core.homeMessages(d.text),{model:MODEL,generate:async()=>'{"tool":"calculate","expression":"2+3"}',tool:async()=>{tools++;},save:async()=>false}),/STORAGE_FAILED/);assert.equal(tools,0);
});
await test('relecture critique séparée du contrôle de forme, correction ciblée unique',async()=>{
 let answerCalls=0;const d=baseJob(),r=await pipeline.runAnswerPipeline(d,core.homeMessages(d.text),{model:MODEL,generate:async(_m,_n,l)=>{if(l==='Choix de la prochaine étape')return '{"tool":"answer"}';if(l==='Relecture critique')return 'La date n’est pas dans les informations disponibles.';answerCalls++;return l==='Réponse approfondie'?'La livraison sera lundi.':'La date de livraison reste à préciser.';},save:async()=>true});assert.equal(answerCalls,2);assert.match(r.answer,/reste à préciser/);
});
await test('UI branche l’outil aux données actuelles et conserve le journal après réponse',async()=>{
 const h=uiHarness({run:async(j,{onTool})=>{const result=await onTool({tool:'calculate',expression:'19*4'});return{answer:'Le résultat est 76.',localWork:{decisions:1,receipts:[{action:{tool:'calculate',expression:'19*4'},result}],stop:'Terminé'}};}}),api=await h.ready;await api.handle('Calcule 19*4 en prenant ton temps');assert.equal(h.db.data.settings.get(CHAT)[1].work.localWork.receipts[0].result.evidence[0].text,'19*4 = 76');assert.match(h.text(),/Travail local effectué/);
});
await test('UI refuse une lecture d’outil après restauration concurrente',async()=>{
 const h=uiHarness({run:async(j,{onTool})=>{await backup.restoreBackup(h.db,backup.serializeBackup(await backup.snapshot(h.db)));await onTool({tool:'recall_conversation',query:'projet'});return{answer:'Ne doit pas apparaître'};}}),api=await h.ready;await api.handle('Compare mes idées');assert.equal(h.db.data.settings.get(CHAT),undefined);assert.match(h.text(),/Enregistrement non confirmé/);
});


await test('protocole d’outil : aller-retour Worker, résultat vérifié et job étranger refusé',async()=>{
 const h=runnerHarness({toolRequest:{action:{tool:'calculate',expression:'7*9'}}});await h.run(baseJob());const receipt=h.workers[0].sent.find(x=>x.type==='TOOL_RESULT');assert.equal(receipt.result.evidence[0].text,'7*9 = 63');assert.equal(receipt.jobId,'job1');
 const wrong=runnerHarness({toolRequest:{jobId:'autre',action:{tool:'calculate',expression:'7*9'}}});await assert.rejects(()=>wrong.run(baseJob()),/incompatible/);assert.equal(wrong.workers[0].sent.some(x=>x.type==='TOOL_RESULT'),false);
 const limit=runnerHarness({toolRequest:{id:9,action:{tool:'calculate',expression:'7*9'}}});await assert.rejects(()=>limit.run(baseJob()),/incompatible/);
});
await test('Worker et circuit réels : budget 768, ACK durable, outil local puis réponse relue',async()=>{
 const output=[],predictions=[];let decisions=0,c;
 const engine={getLoadedContextInfo:()=>({n_ctx:4096}),tokenize:async text=>Array(Math.ceil(text.length/3)).fill(1),createCompletion:async(text,o)=>{predictions.push(o.nPredict);const raw=text.includes('Décide la prochaine action utile')?(decisions++===0?'{"tool":"calculate","expression":"2+3"}':'{"tool":"answer"}'):text.includes('Relis cette réponse')?'OK':'Le résultat est de cinq unités.';o.onNewToken(1,new Uint8Array(),raw);return raw;}};
 c=vm.createContext({...workCore,...workBudget,HOME_LIMITS:core.HOME_LIMITS,HOME_PROTOCOL:core.HOME_PROTOCOL,homeMessages:core.homeMessages,MODEL,PROFILES:[{sliceMs:0,pauseMs:0}],fitDialogueContext:budget.fitDialogueContext,runAnswerPipeline:pipeline.runAnswerPipeline,performance,setTimeout,clearTimeout,setInterval,clearInterval,Error,Map,Promise,diagnosticCode:()=>'',activateModel:async()=>{},passthrough:async(_g,fn)=>({value:await fn(),stats:{runtime:'test',batches:1,decodedTokens:1,pauses:0,idleMs:0,computeMs:1}}),self:{postMessage:p=>{output.push(p);if(p.type==='CHECKPOINT')queueMicrotask(()=>c.self.onmessage({data:{type:'CHECKPOINT_ACK',id:p.id,ok:true,checkpoint:p.checkpoint}}));if(p.type==='TOOL_REQUEST')queueMicrotask(async()=>c.self.onmessage({data:{type:'TOOL_RESULT',jobId:p.jobId,id:p.id,ok:true,result:await workCore.executeLocalTool(p.action)}}));}}});
 vm.runInContext(src('blob-assistant-worker.js').replace(/^import .*;\s*$/gm,'').replace("await import('/blob-cooperative-decode.js?v=A72.3')",'{withCooperativeDecode:passthrough}')+'\nglobalThis.attach=g=>generator=g;',c);c.attach(engine);
 await c.self.onmessage({data:{type:'CHAT',jobId:'job1',homeProtocol:core.HOME_PROTOCOL,mode:'deep',text:'Quel est le résultat du calcul ?',context:{localOnly:true}}});
 assert.equal(output.some(p=>p.type==='ERROR'),false);assert(predictions.includes(768));assert.equal(output.filter(p=>p.type==='TOOL_REQUEST').length,1);const answer=output.find(p=>p.type==='ANSWER');assert(answer);assert.equal(answer.localWork.receipts[0].result.evidence[0].text,'2+3 = 5');assert(answer.review.criticalReview);assert(output.some(p=>p.type==='CONTEXT'&&p.label==='Réponse approfondie'));
});
await test('sources affichées de la réponse conservées même si la relecture en écarte une',async()=>{
 const h=uiHarness({run:async(_j,{onContext})=>{onContext({label:'Réponse approfondie',retainedSources:[{source:'CALCULATOR',id:'2+3',title:'Calcul'}]});onContext({label:'Relecture critique',retainedSources:[]});return{answer:'Le résultat est 5.'};}}),api=await h.ready;await api.handle('Compare ces idées');assert.equal(h.db.data.settings.get(CHAT)[1].work.sources[0].source,'CALCULATOR');
});


await test('anciens projets : empreinte de reprise inchangée et réponse conservée sans recalcul',async()=>{
 const {graphIdentity}=await import(moduleURL('blob-reasoning-graph.js')),text='Projet historique',messages=[{role:'user',content:text,required:true}];
 const identity=await graphIdentity({schema:'noyau-answer-pipeline-A68',mode:'deep',graph:null,model:MODEL},text,messages);
 const r=await pipeline.runAnswerPipeline({text,mode:'deep',checkpoint:{answer:{identity,final:'Résultat déjà conservé du projet.'}}},messages,{model:MODEL,generate:async()=>{throw Error('Régression : nouvelle génération');},save:async()=>true});assert.equal(r.review.reusedFinal,true);
});


const approvedJob=()=>({...baseJob(),workControl:workBudget.initialWorkControl()});
function controlledRun(job,{answerAt=Infinity,empty=false,failSave=false}={}){
 let checkpoint=job.checkpoint,calls=0,tools=0,number=(checkpoint?.answer?.local?.decisions||0);
 const promise=pipeline.runAnswerPipeline(job,core.homeMessages(job.text,job.context),{model:MODEL,generate:async(_m,_n,label)=>{calls++;if(label==='Choix de la prochaine étape'){if(number>=answerAt)return '{"tool":"answer"}';return JSON.stringify({tool:'calculate',expression:'1+'+(++number)});}return label==='Relecture critique'?'OK':'Les résultats des calculs sont disponibles, avec les limites de cette recherche.';},tool:async a=>{tools++;return empty?{status:'empty',evidence:[],message:'Aucun résultat.'}:workCore.executeLocalTool(a);},save:async x=>{if(failSave)return false;checkpoint=structuredClone(x);return true;}});
 return {promise,get checkpoint(){return checkpoint;},get tools(){return tools;},get calls(){return calls;}};
}
await test('A112 : quatre outils puis proposition concrète, aucun cinquième outil sans accord',async()=>{
 const job=approvedJob(),h=controlledRun(job),r=await h.promise;assert.equal(h.tools,4);assert.equal(h.calls,5);assert(r.awaitingApproval);assert.equal(r.answer,undefined);assert.equal(h.checkpoint.answer.local.pending.expression,'1+5');assert.equal(h.checkpoint.answer.local.receipts.length,4);
 const noConsent=controlledRun({...job,checkpoint:h.checkpoint});await noConsent.promise;assert.equal(noConsent.tools,0);assert.equal(noConsent.calls,0);
});
await test('A112 : accord explicite, reprise sans recalcul de décision ni double résultat',async()=>{
 const job=approvedJob(),first=controlledRun(job);await first.promise;job.checkpoint=first.checkpoint;job.workControl=workBudget.approveWork(job,'continue');assert.equal(job.workControl.approvedTools,8);assert.equal(workBudget.awaitingWork(job),false);assert.throws(()=>workBudget.approveWork(job,'continue'),/Aucune prolongation/);
 const second=controlledRun(job),r=await second.promise;assert.equal(second.tools,4);assert.equal(second.calls,4);assert(r.awaitingApproval);assert.equal(r.localWork.receipts.length,8);assert.equal(new Set(r.localWork.receipts.map(r=>r.action.expression)).size,8);
});
await test('A112 : réponse maintenant conserve les preuves et ne lance plus de recherche',async()=>{
 const job=approvedJob(),h=controlledRun(job);await h.promise;job.checkpoint=h.checkpoint;job.workControl=workBudget.approveWork(job,'finish');const end=controlledRun(job),r=await end.promise;assert.equal(end.tools,0);assert.equal(end.calls,2);assert.equal(r.localWork.receipts.length,4);assert.equal(r.localWork.pending,null);assert.match(r.localWork.stop,/demandée/);assert(r.answer);
});
await test('A112 : vingt-quatre outils au plafond, cinq prolongations puis réponse',async()=>{
 const job=approvedJob();let rounds=0,tools=0,result;
 do{const h=controlledRun(job);result=await h.promise;tools+=h.tools;job.checkpoint=h.checkpoint;rounds++;if(result.awaitingApproval)job.workControl=workBudget.approveWork(job,'continue');}while(result.awaitingApproval&&rounds<10);
 assert.equal(rounds,6);assert.equal(tools,24);assert(result.answer);assert.equal(job.workControl.approvedTools,24);assert.match(result.localWork.stop,/Plafond/);assert.throws(()=>workBudget.approveWork(job,'continue'),/Aucune prolongation/);
});
await test('A112 : aucune attente artificielle pour une discussion simple ou une recherche infructueuse',async()=>{
 const quick=controlledRun(approvedJob(),{answerAt:0}),r=await quick.promise;assert.equal(quick.tools,0);assert.equal(r.awaitingApproval,undefined);
 const none=controlledRun(approvedJob(),{empty:true}),s=await none.promise;assert.equal(none.tools,2);assert.match(s.localWork.stop,/sans résultat/);assert.equal(s.awaitingApproval,undefined);
});
await test('A112 : quota avant outil interdit toute exécution et budget malformé refusé',async()=>{
 const h=controlledRun(approvedJob(),{failSave:true});await assert.rejects(()=>h.promise,/STORAGE_FAILED/);assert.equal(h.tools,0);
 for(const approvedTools of [0,5,28,-4,Infinity])assert.throws(()=>workBudget.workControl({protocol:workBudget.WORK_PROTOCOL,approvedTools,finish:false}),/incompatible/);
});
await test('A112 : état en attente survit à fermeture, sauvegarde et restauration, sans démarrage automatique',async()=>{
 const job=approvedJob(),p=controlledRun(job);await p.promise;job.checkpoint=p.checkpoint;job.status='awaiting_approval';const db=new TestDB();db.data.settings.set(JOB,job);
 const restored=new TestDB();await backup.restoreBackup(restored,backup.serializeBackup(await backup.snapshot(db)));const h=uiHarness({db:restored}),api=await h.ready;assert.equal(h.calls,0);assert.equal(h.button('Reprendre ce travail').hidden,true);assert.equal(h.button('Continuer · 4 étapes maximum').hidden,false);assert.match(h.text(),/Je continue/);assert(api.acceptsContinuation('Oui continue'));
});
await test('A112 : continuer depuis la conversation ajoute exactement quatre étapes et garde la demande',async()=>{
 const job=approvedJob(),p=controlledRun(job);await p.promise;job.checkpoint=p.checkpoint;const db=new TestDB();db.data.settings.set(JOB,job);let got;
 const h=uiHarness({db,run:async j=>{got=j;throw Error('Pause simulée');}}),api=await h.ready;await api.handle('Oui, continue');assert.equal(got.id,job.id);assert.equal(got.text,job.text);assert.equal(got.workControl.approvedTools,8);assert.equal((await store.readLocalState(db)).archive.length,0);assert.equal(h.accepted,1);
});
await test('A112 : reprise après accord interrompu ne redonne pas un second accord',async()=>{
 const job=approvedJob(),p=controlledRun(job);await p.promise;job.checkpoint=p.checkpoint;job.workControl=workBudget.approveWork(job,'continue');const db=new TestDB();db.data.settings.set(JOB,job);let got;
 const h=uiHarness({db,run:async j=>{got=j;throw Error('Pause');}}),api=await h.ready;assert.equal(h.button('Reprendre ce travail').hidden,false);assert.equal(h.button('Continuer · 4 étapes maximum').hidden,true);await api.handle('Reprends ce travail');assert.equal(got.workControl.approvedTools,8);
});
await test('A112 : un retour de permission ne devient jamais une fausse réponse terminée',async()=>{
 const h=uiHarness({run:async(j,{saveCheckpoint})=>{const p=controlledRun(j),r=await p.promise;await saveCheckpoint(p.checkpoint);return r;}}),api=await h.ready;await api.handle('Compare ces deux idées');assert.equal(h.db.data.settings.get(CHAT),undefined);assert.equal(h.db.data.settings.get(JOB).status,'awaiting_approval');assert.equal(h.button('Continuer · 4 étapes maximum').hidden,false);
});
await test('A112 : répondre maintenant par texte conserve la même demande et ne l’archive pas',async()=>{
 const job=approvedJob(),p=controlledRun(job);await p.promise;job.checkpoint=p.checkpoint;const db=new TestDB();db.data.settings.set(JOB,job);let got;
 const h=uiHarness({db,run:async j=>{got=j;return{answer:'La synthèse des informations disponibles.'};}}),api=await h.ready;await api.handle('Réponds maintenant');assert(got.workControl.finish);assert.equal(db.data.settings.get(CHAT)[0].content,job.text);assert.equal(db.data.settings.get(JOB),null);
});
await test('A112 : modifier une préférence invalide le travail et réinitialise les autorisations supplémentaires',()=>{
 const s=fresh();s.job={...approvedJob(),workControl:{...workBudget.initialWorkControl(),approvedTools:16}};const patch=core.preferencePatch(s,s.personal);assert.equal(patch.job.workControl.approvedTools,4);assert.equal(patch.job.checkpoint,null);
});
await test('A112 : sauvegarde refuse un budget corrompu, sans toucher aux données',async()=>{
 const db=new TestDB(),b=await backup.snapshot(db);b.settings[JOB]={...approvedJob(),workControl:{...workBudget.initialWorkControl(),approvedTools:999}};assert.throws(()=>backup.validateBackup(b),/incompatible/);assert.equal(db.data.settings.has(JOB),false);
});
await test('A112 : frontière Worker refuse un cinquième outil non autorisé et transmet le budget',async()=>{
 const job=approvedJob(),h=runnerHarness({toolRequest:{id:5,action:{tool:'calculate',expression:'1+5'}}});await assert.rejects(()=>h.run(job),/incompatible/);assert.equal(h.workers[0].sent.find(m=>m.type==='CHAT').workControl.approvedTools,4);assert.equal(h.released,1);
});
await test('A112 : reprise d’un travail interrompu avec continue conserve aussi le plafond initial',async()=>{
 const job=approvedJob(),db=new TestDB();db.data.settings.set(JOB,job);let got;
 const h=uiHarness({db,run:async j=>{got=j;throw Error('Pause');}}),api=await h.ready;await api.handle('Continue');assert.equal(got.id,job.id);assert.equal(got.workControl.approvedTools,4);
});
await test('A112 : mesures cumulées des étapes terminées sont enregistrées, pas réinitialisées à la reprise',async()=>{
 const job=approvedJob(),db=new TestDB();job.usage={outputTokens:100,generations:2};db.data.settings.set(JOB,job);
 const h=uiHarness({db,run:async(j,{onUsage})=>{onUsage({outputTokens:40,generations:1});throw Error('Pause');}}),api=await h.ready;await api.handle('Continue');assert.equal(db.data.settings.get(JOB).usage.outputTokens,140);assert.equal(db.data.settings.get(JOB).usage.generations,3);
});

await test('A112 : Worker réel s’arrête à la demande d’accord, sans synthèse ni activation finale',async()=>{
 const output=[],predictions=[];let decisions=0,c,last,activated=0;
 const engine={getLoadedContextInfo:()=>({n_ctx:4096}),tokenize:async text=>Array(Math.ceil(text.length/3)).fill(1),createCompletion:async(text,o)=>{predictions.push(o.nPredict);assert(text.includes('Décide la prochaine action utile'));const raw=JSON.stringify({tool:'calculate',expression:'2+'+(++decisions)});o.onNewToken(1,new Uint8Array(),raw);return raw;}};
 c=vm.createContext({...workCore,...workBudget,HOME_LIMITS:core.HOME_LIMITS,HOME_PROTOCOL:core.HOME_PROTOCOL,homeMessages:core.homeMessages,MODEL,PROFILES:[{sliceMs:0,pauseMs:0}],fitDialogueContext:budget.fitDialogueContext,runAnswerPipeline:pipeline.runAnswerPipeline,performance,setTimeout,clearTimeout,setInterval,clearInterval,Error,Map,Promise,diagnosticCode:()=>'',activateModel:async()=>{activated++;},passthrough:async(_g,fn)=>({value:await fn(),stats:{runtime:'test',batches:1,decodedTokens:1,pauses:0,idleMs:0,computeMs:1}}),self:{postMessage:p=>{output.push(p);if(p.type==='CHECKPOINT'){last=structuredClone(p.checkpoint);queueMicrotask(()=>c.self.onmessage({data:{type:'CHECKPOINT_ACK',id:p.id,ok:true,checkpoint:p.checkpoint}}));}if(p.type==='TOOL_REQUEST')queueMicrotask(async()=>c.self.onmessage({data:{type:'TOOL_RESULT',jobId:p.jobId,id:p.id,ok:true,result:await workCore.executeLocalTool(p.action)}}));}}});
 vm.runInContext(src('blob-assistant-worker.js').replace(/^import .*;\s*$/gm,'').replace("await import('/blob-cooperative-decode.js?v=A72.3')",'{withCooperativeDecode:passthrough}')+'\nglobalThis.attach=g=>generator=g;',c);c.attach(engine);
 await c.self.onmessage({data:{type:'CHAT',jobId:'job1',homeProtocol:core.HOME_PROTOCOL,workControl:workBudget.initialWorkControl(),mode:'deep',text:'Compare les calculs utiles',context:{localOnly:true}}});
 assert.equal(output.some(p=>p.type==='ERROR'),false);assert.equal(output.filter(p=>p.type==='TOOL_REQUEST').length,4);const r=output.find(p=>p.type==='ANSWER');assert(r.awaitingApproval);assert.equal(r.answer,undefined);assert(last.answer.local.awaitingApproval);assert.equal(last.answer.local.receipts.length,4);assert.equal(activated,0);assert.deepEqual(predictions,[128,128,128,128,128]);
});
await test('A112 : une faute d’enregistrement de l’accord conserve le budget et ne lance pas le modèle',async()=>{
 const job=approvedJob(),p=controlledRun(job);await p.promise;job.checkpoint=p.checkpoint;const db=new TestDB();db.data.settings.set(JOB,job);const h=uiHarness({db}),api=await h.ready;db.failAfter=1;await assert.rejects(()=>api.handle('Continue'),/quota/);assert.equal(db.data.settings.get(JOB).workControl.approvedTools,4);assert.equal(h.calls,0);
});
await test('A112 : arrêt au choix répété conserve un seul résultat au lieu de demander un budget',async()=>{
 let tools=0;const job=approvedJob(),r=await pipeline.runAnswerPipeline(job,core.homeMessages(job.text),{model:MODEL,generate:async(_m,_n,label)=>label==='Choix de la prochaine étape'?'{"tool":"calculate","expression":"3+4"}':label==='Relecture critique'?'OK':'Le calcul donne sept unités.',tool:async a=>{tools++;return workCore.executeLocalTool(a);},save:async()=>true});assert.equal(tools,1);assert.match(r.localWork.stop,/répétée/);assert.equal(r.awaitingApproval,undefined);
});
const report={release:'A112',scope:'Modules et gestionnaires réels ; IndexedDB, DOM, temps, cache et inférence simulés. Aucun test physique iPhone ni mesure réelle de qualité du modèle.',passed:tests.filter(t=>t.passed).length,failed:tests.filter(t=>!t.passed).length,tests};fs.writeFileSync(new URL('./a112-conversation.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,failed:report.failed,failures:tests.filter(t=>!t.passed)},null,2));
