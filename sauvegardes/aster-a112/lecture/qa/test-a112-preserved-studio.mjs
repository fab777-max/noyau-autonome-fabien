import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createRequire} from 'node:module';
import {TestDB} from './memory-double.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,Image}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=new URL('../public/',import.meta.url), src=n=>fs.readFileSync(new URL(n,root),'utf8'), cache=new Map();
function moduleURL(n){if(!cache.has(n))cache.set(n,'data:text/javascript;base64,'+Buffer.from(src(n).replace(/from ['"]\/([^'"?]+)(?:\?[^'"]*)?['"]/g,(_,f)=>'from '+JSON.stringify(moduleURL(f)))).toString('base64'));return cache.get(n);}
const core=await import(moduleURL('aster-studio-core.js')), workshop=await import(moduleURL('noyau-workshop-core.js'));
const store=await import(moduleURL('noyau-workshop-store.js')), recovery=await import(moduleURL('noyau-backup.js'));
const renderer=await import(moduleURL('noyau-workshop-render.js'));
const writing=await import(moduleURL('aster-writing-core.js'));
const photoCore=await import(moduleURL('aster-photo-core.js'));
const learning=await import(moduleURL('noyau-learning.js'));
const studyCore=await import(moduleURL('aster-study-core.js'));
const studyCases=await import(moduleURL('aster-study-cases.js'));
const studyStore=await import(moduleURL('aster-study-store.js'));
const training=await import(moduleURL('aster-training-data.js'));
const images=await import(moduleURL('aster-image-core.js'));
const MODEL={id:'test-model',revision:'rev-1'};
const tests=[];const now='2026-10-17T00:00:00Z';
async function test(name,fn){try{await fn();tests.push({name,passed:true});}catch(e){tests.push({name,passed:false,error:e.stack});process.exitCode=1;}}
function canvas(){const c=createCanvas(1,1);c.setAttribute=()=>{};c.tagName='CANVAS';c.toBlob=(cb,type)=>cb(new Blob([c.toBuffer(type)],{type}));return c;}
globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return canvas();}};globalThis.Image=Image;
const sample=createCanvas(960,600),cx=sample.getContext('2d');cx.fillStyle='#bdcdb1';cx.fillRect(0,0,960,600);cx.fillStyle='#496c4a';cx.fillRect(80,100,800,390);cx.fillStyle='#e9eddb';cx.font='48px sans-serif';cx.fillText('DÉMONSTRATION FICTIVE',140,280);cx.font='28px sans-serif';cx.fillText('Illustration de test · aucune réalisation client',150,340);
const photo={id:'photo-1',name:'illustration-test.jpg',data:sample.toDataURL('image/jpeg'),width:960,height:600};
function writingRunner(counter,options={}){return async(initial,{save,signal})=>{counter.count++;if(options.absent)throw Error('Modèle absent. Aucun téléchargement lancé.');let r=writing.startWriting(initial);await save(r);for(let i=0;i<3;i++){if(r.writing.steps[i].status==='done')continue;r=writing.beginWritingStep(r,i);await save(r);if(options.pauseAt===i){r=writing.interruptWriting(r,'Pause demandée');await save(r);throw Error('Pause demandée');}r=writing.finishWritingStep(r,i,{text:['Une présentation proposée par le modèle.','Une publication proposée par le modèle.','Un message proposé par le modèle.'][i],outputTokens:18,wallMs:55});await save(r);}return r;};}
async function savedUI(runner){const db=new TestDB();await store.saveDossier(db,workshop.workshopState(null),complete());const h=await ui({db,runner});await h.idle();return h;}
function complete(){let d=core.newStudioDossier('d-1',now);for(const text of ['Pose de lames en bois. Finitions à confirmer, aucun délai garanti.','Atelier Exemple · Démo','Terrasse en bois — exemple fictif'])d=core.submitMessage(d,text,now);return core.addPhotos(d,[structuredClone(photo)]);}
await test('échange court : faits, nom, titre, photo puis relecture',()=>{const d=complete();assert.equal(core.nextStep(d),'review');assert.equal(d.captions.length,3);assert(d.captions.every(x=>x.includes('Finitions à confirmer')));assert.equal(d.factsConfirmed,false);assert.equal(d.rightsConfirmed,false);assert.equal(d.studio.messages.length,7);});
await test('brief complet en un message sans inventer ville, prix ou contact',()=>{const d=core.submitMessage(core.newStudioDossier('x',now),'Nom : Démo\nTitre : Pose\nFaits : Essai confirmé.\nVille : Vienne',now);assert.equal(d.facts.business,'Démo');assert.equal(d.facts.city,'Vienne');assert.equal(d.facts.price,'');assert.equal(core.nextStep(d),'photos');});
await test('salutation et demande générique ne deviennent pas des faits',()=>{for(const text of ['Bonjour !','Prépare une présentation avec mes photos']){const d=core.submitMessage(core.newStudioDossier('x',now),text,now);assert.equal(d.facts.details,'');}});
await test('recherche ou code non exécutés et limite expliquée',()=>{const d=core.submitMessage(core.newStudioDossier('x',now),'Recherche sur internet les meilleurs modèles',now);assert.equal(d.facts.details,'');assert.match(d.studio.messages.at(-1).text,/ne lance pas/);});
await test('corrections naturelles conservent accents, noms et casse',()=>{let d=complete();d.factsConfirmed=true;d=core.submitMessage(d,'Change le titre en Une terrasse à Vienne',now);assert.equal(d.facts.title,'Une terrasse à Vienne');assert.equal(d.factsConfirmed,false);d=core.submitMessage(d,'Ajoute le contact : 06 00 00 00 00',now);assert.equal(d.facts.contact,'06 00 00 00 00');d=core.submitMessage(d,'modifie le texte 1',now);assert.equal(d.studio.editing,'caption0');d=core.submitMessage(d,'Texte relu à Vienne.',now);assert.equal(d.captions[0],'Texte relu à Vienne.');});
await test('brouillon et faits antérieurs intacts après un refus de longueur',()=>{const d=complete(),before=structuredClone(d);assert.throws(()=>core.submitMessage(core.beginEdit(d,'title'),'x'.repeat(91)),/90 caractères/);assert.deepEqual(d,before);});
await test('champs répétés ou ambiguïté dans un brief sont refusés sans tronquer',()=>{const d=core.newStudioDossier('x',now);assert.throws(()=>core.submitMessage(d,'Nom : A\nNom : B'),/deux fois/);assert.throws(()=>core.submitMessage(d,'Faits : A\nUn détail en plus'),/lignes restantes/);assert.equal(d.facts.details,'');});
await test('photos ajoutées révoquent la validation et refusent le dépassement',()=>{const d=complete();d.factsConfirmed=d.rightsConfirmed=true;const n=core.addPhotos(d,[{...photo,id:'p2'}]);assert.equal(n.factsConfirmed,false);assert.equal(n.rightsConfirmed,false);assert.throws(()=>core.addPhotos(d,Array.from({length:6},(_,i)=>({...photo,id:'p'+i}))),/invalide/);});
await test('sauvegarde privée et import préservent tous les échanges et brouillons',()=>{const d=complete();d.studio.draft='À finir demain';d.factsConfirmed=d.rightsConfirmed=true;const n=core.importPrivateProject(core.exportPrivateProject(d),'copy',now);assert.equal(n.studio.draft,d.studio.draft);assert.deepEqual(n.studio.messages,d.studio.messages);assert.equal(n.id,'copy');assert.equal(n.factsConfirmed,false);assert.equal(n.rightsConfirmed,false);});
await test('validation import refuse conversations invalides avant écriture',()=>{const d=complete();d.studio.messages[0].role='system';assert.throws(()=>core.importPrivateProject(JSON.stringify({schema:'noyau-dossier-v1',dossier:d}),'x'),/Message/);});
await test('ancien dossier incomplet : textes manquants proposés, texte personnel conservé',()=>{const d=complete();delete d.studio;d.captions=['Texte déjà relu'];d.source='OWNER_EDITED';const n=core.studioDossier(d);assert.equal(n.captions.length,3);assert.equal(n.captions[0],d.captions[0]);assert(n.captions[1].includes(d.facts.details));assert.equal(d.captions.length,1);assert.equal(n.factsConfirmed,false);});
await test('écriture en conflit ne remplace pas une version plus récente',async()=>{const db=new TestDB(),d=complete();let state=await store.saveDossier(db,workshop.workshopState(null),d);await assert.rejects(()=>store.saveDossier(db,workshop.workshopState(null),{...d,facts:{...d.facts,title:'Autre'}}),/autre onglet/);assert.equal(db.data.settings.get(workshop.WORKSHOP_KEY).revision,state.revision);});
await test('échec transactionnel protège le dernier projet confirmé',async()=>{const db=new TestDB(),d=complete();const state=await store.saveDossier(db,workshop.workshopState(null),d);db.failAfter=1;await assert.rejects(()=>store.saveDossier(db,state,{...d,studio:{...d.studio,draft:'Nouveau'}}),/quota/);assert.equal(db.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0].studio.draft,'');});
await test('sauvegarde complète et retour arrière incluent les projets conversationnels',async()=>{const db=new TestDB(),d=complete();await store.saveDossier(db,workshop.workshopState(null),d);const payload=recovery.serializeBackup(await recovery.snapshot(db));const restored=new TestDB();await recovery.restoreBackup(restored,payload);assert.deepEqual(restored.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0].studio,d.studio);assert(restored.data.settings.has(recovery.ROLLBACK_KEY));});
await test('deux PNG réels et fiche échappée exportables sans dépendance réseau',async()=>{const d=complete();const a=await renderer.poster(d,'vertical'),b=await renderer.poster(d,'story');assert.equal(a.width,1080);assert.equal(a.height,1350);assert.equal(b.height,1920);const ab=await renderer.canvasBlob(a),bb=await renderer.canvasBlob(b);assert.equal(ab.type,'image/png');assert(ab.size>10000);fs.mkdirSync(new URL('./a112-preserved-output/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./a112-preserved-output/publication.png',import.meta.url),Buffer.from(await ab.arrayBuffer()));fs.writeFileSync(new URL('./a112-preserved-output/story.png',import.meta.url),Buffer.from(await bb.arrayBuffer()));d.facts.business='<script>alert(1)</script>';const html=workshop.printableHTML(d);assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));const zip=workshop.zipFiles([{name:'publication.png',data:new Uint8Array(await ab.arrayBuffer())},{name:'story.png',data:new Uint8Array(await bb.arrayBuffer())},{name:'fiche.html',data:html},{name:'textes.txt',data:d.captions.join('\n\n')}]);fs.writeFileSync(new URL('./a112-preserved-output/presentation-test.zip',import.meta.url),Buffer.from(await zip.arrayBuffer()));});

const workCore=await import(moduleURL('aster-work-core.js')),workBudget=await import(moduleURL('aster-work-budget.js'));
const corrections=await import(moduleURL('aster-conversation-learning.js')),documentStore=await import(moduleURL('noyau-documents-store.js'));
const home=await import(moduleURL('aster-conversation-core.js'));
const homeStore=await import(moduleURL('noyau-dialogue-store.js')),personal=await import(moduleURL('blob-personal-core.js')),documents=await import(moduleURL('noyau-documents-core.js'));
function element(tag='div',all=[]){const e={tagName:tag.toUpperCase(),children:[],value:'',textContent:'',hidden:false,disabled:false,checked:false,dataset:{},attributes:{},handlers:{},className:'',append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=[];this.append(...nodes);},setAttribute(k,v){this.attributes[k]=v;},addEventListener(n,f){this.handlers[n]=f;},focus(){this.focused=true;},scrollIntoView(){},showModal(){this.open=true;},close(){this.open=false;},click(){return this.onclick?.();}};all.push(e);return e;}
async function ui({db=new TestDB(),presentation=true,studyRunner=null,runner=async()=>{throw Error('Moteur absent dans ce test');}}={}){
  const all=[],ids=[...src('index.html').matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"[^>]*>/g)],els=new Map(ids.map(m=>{const e=element(m[1],all);e.hidden=/\bhidden(?:\s|>)/.test(m[0]);e.disabled=/\bdisabled(?:\s|>)/.test(m[0]);return[m[2],e];})),urls=new Map(),timers=new Map(),events={};let timer=0;
  const get=id=>{const e=els.get(id)||all.filter(e=>e.id===id).at(-1);assert(e,id);return e;};
  let urlSequence=0;
  class LocalURL extends URL{static createObjectURL(b){const u='blob:test-'+(++urlSequence);urls.set(u,b);return u;}static revokeObjectURL(u){urls.delete(u);}}
  class TestChannel{constructor(name){events[name]=this;}}
  const c=vm.createContext({...core,...workshop,...store,...renderer,...writing,...photoCore,...learning,...studyCore,...studyCases,...studyStore,...training,...images,...home,...homeStore,...personal,...documents,...corrections,...documentStore,...workCore,...workBudget,MODEL,performance,setInterval,clearInterval,runHomeDialogue:async(job,{saveCheckpoint})=>{await saveCheckpoint({answer:{final:'Réponse locale simulée pour '+job.text}});return {answer:'Réponse locale simulée pour '+job.text,review:{passed:true}};},runLocalWriting:runner,BroadcastChannel:TestChannel,AbortController,console,URL:LocalURL,Blob,File,Image,Date,JSON,Number,String,Promise,Map,Error,structuredClone,crypto:webcrypto,TextEncoder,
    importPhoto:async(file,id)=>{if(file.bad)throw Error('Photo illisible');return{...photo,id};},
    document:{getElementById:get,createElement:t=>t==='canvas'?canvas():element(t,all),createTextNode:t=>t,querySelectorAll:()=>all.filter(e=>Object.hasOwn(e.dataset,'editControl')),addEventListener:(n,f)=>events[n]=f,hidden:false},
    window:{BlobLocalMemory:{open:async()=>db,setting:async(_,key)=>structuredClone(db.data.settings.get(key))},addEventListener(){}},navigator:{},location:{hash:'',replace(){}},
    setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:n=>timers.delete(n),confirm:()=>true});
  vm.runInContext(src('aster-conversation-ui.js').replace(/^import .*;\s*$/gm,'').replace('export async function','async function'),c);
  vm.runInContext(src('aster-image-ui.js').replace(/^import .*;\s*$/gm,'').replace('export async function','async function'),c);
  vm.runInContext(src('aster-study-ui.js').replace(/^import .*;\s*$/gm,'').replace('export async function','async function'),c);
  c.runStudy=studyRunner|| (async(s,{save})=>{const r=structuredClone(s);r.status='review';r.reason='Moteur simulé de test';await save(r);return r;});
  let code=src('aster-studio.js').replace(/^import .*;\s*$/gm,'').replace(/\ninit\(\);\s*$/,'\nconst ready=init();');
  await vm.runInContext('(async()=>{'+code+';await ready;presentationActive='+presentation+';renderMessages();globalThis.api={read:()=>({state,current,busy,blocked,unsaved,previewCanvases}),idle:async()=>{await saveQueue;await previewPromise;await photoPreviewPromise;},render,queueDraft};})()',c);
  return{c,db,get,urls,events,timers,all,input(text){get('studioInput').value=text;get('studioInput').handlers.input();},send:()=>get('studioForm').onsubmit({preventDefault(){}}),idle:()=>c.api.idle()};
}
await test('Accueil par défaut : question générale traitée par le dialogue, aucun fait de présentation ajouté',async()=>{const h=await ui({presentation:false});h.input('Bonjour, je suis Fabien');await h.send();assert.equal(h.db.data.settings.get('noyauStandaloneDialogue-v1').length,2);assert.equal(h.c.api.read().current.facts.details,'');assert.equal(h.get('studioInput').value,'');assert.equal(h.get('studioQuestion').hidden,true);});
await test('Accueil : préférence explicite disponible après réouverture dans le même champ',async()=>{const h=await ui({presentation:false});h.input('Retiens que je préfère des réponses simples');await h.send();const h2=await ui({db:h.db,presentation:false});h2.input('Que sais-tu de moi ?');await h2.send();assert.match(h2.db.data.settings.get('noyauStandaloneDialogue-v1').at(-1).content,/réponses simples/);assert.equal(h2.c.api.read().current.facts.business,'');});
await test('Accueil : passage explicite à la présentation et question incidente sans confusion de faits',async()=>{const h=await ui({presentation:false});h.input('Prépare une présentation');await h.send();h.input('Une terrasse en bois');await h.send();assert.equal(h.c.api.read().current.facts.details,'Une terrasse en bois');h.input('Comment choisir un titre ?');await h.send();assert.equal(h.c.api.read().current.facts.business,'');assert.equal(h.db.data.settings.get('noyauStandaloneDialogue-v1').length,2);});
await test('Accueil : brouillon général ne crée aucun dossier et revient après réouverture',async()=>{
 const h=await ui({presentation:false});h.input('Je voudrais discuter de mon avenir');await h.c.api.queueDraft();assert.equal(h.db.data.settings.has(workshop.WORKSHOP_KEY),false);
 const next=await ui({db:h.db,presentation:false});assert.equal(next.get('studioInput').value,'Je voudrais discuter de mon avenir');await next.send();assert.equal(next.get('studioInput').value,'');assert.equal(next.db.data.settings.has(workshop.WORKSHOP_KEY),false);
});
await test('Accueil : question depuis un projet préserve son brouillon ; retour à la discussion isolé',async()=>{
 const db=new TestDB(),d=complete();d.studio.draft='Description photo à terminer';await store.saveDossier(db,workshop.workshopState(null),d);const h=await ui({db,presentation:true});h.input('Comment organiser ma semaine ?');await h.send();assert.equal(db.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0].studio.draft,'Description photo à terminer');
 await h.get('openProjects').onclick();await h.all.filter(e=>e.className==='project-open').at(-1).onclick();assert.equal(h.get('studioInput').value,'Description photo à terminer');await h.get('returnConversation').onclick();assert.equal(h.get('studioInput').value,'');assert.equal(db.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0].studio.draft,'Description photo à terminer');
});
await test('UI réelle : trois réponses et une photo produisent les aperçus puis le ZIP',async()=>{const h=await ui();for(const value of ['Pose de lames en bois.','Atelier Exemple','Terrasse de démonstration']){h.input(value);await h.send();}h.get('studioPhotoInput').files=[{name:'photo.jpg'}];await h.get('studioPhotoInput').onchange();await h.idle();assert.equal(h.get('studioResult').hidden,false);assert(h.c.api.read().previewCanvases);assert.equal(h.get('prepareDelivery').disabled,true);h.get('approveStudio').checked=true;h.get('approveStudio').onchange();await h.get('prepareDelivery').onclick();assert.equal(h.get('delivery').hidden,false);const link=h.get('deliveryLinks').children[0];const bytes=await h.urls.get(link.href).arrayBuffer();assert.equal(new DataView(bytes).getUint32(0,true),0x04034b50);assert(h.db.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0].factsConfirmed);assert.equal(h.get('studioInput').value,'');});
await test('UI réelle : réouverture de la discussion puis du projet retrouve le brouillon de présentation sans exécution',async()=>{const h=await ui();h.input('Une réalisation à conserver');await h.send();h.input('Atelier à terminer');await h.c.api.queueDraft();const reopened=await ui({db:h.db,presentation:false});assert.equal(reopened.get('studioInput').value,'');await reopened.get('openProjects').onclick();await reopened.all.filter(e=>e.className==='project-open').at(-1).onclick();assert.equal(reopened.get('studioInput').value,'Atelier à terminer');assert.equal(reopened.c.api.read().current.studio.messages.length,2);assert.equal(reopened.c.api.read().current.exports,0);});
await test('UI réelle : changement de projet sauvegarde le texte saisi sans attendre le délai',async()=>{const h=await ui();h.input('Réalisation une');await h.send();h.input('Nom encore en cours');await h.get('newStudioProject').onclick();assert.equal(h.db.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0].studio.draft,'Nom encore en cours');assert.equal(h.get('studioInput').value,'');});
await test('UI réelle : échec stockage conserve la saisie et bloque les confirmations trompeuses',async()=>{const h=await ui();h.db.failAfter=1;h.input('Description importante');await h.send();assert.equal(h.get('studioInput').value,'Description importante');assert.equal(h.c.api.read().blocked,true);assert.equal(h.get('recoveryActions').hidden,false);assert.equal(h.get('delivery').hidden,true);assert.equal(h.db.data.settings.has(workshop.WORKSHOP_KEY),false);h.get('saveRescue').onclick();const link=h.get('projectBackupLinks').children[0];const data=JSON.parse(await h.urls.get(link.href).text());assert.equal(data.dossier.studio.draft,'Description importante');});
await test('UI réelle : double envoi produit une seule paire de messages',async()=>{const h=await ui();h.input('Une seule description');await Promise.all([h.send(),h.send()]);assert.equal(h.c.api.read().current.studio.messages.length,2);});
await test('UI réelle : import défectueux parmi plusieurs photos ne sauve pas un lot partiel',async()=>{const h=await ui();h.get('studioPhotoInput').files=[{name:'bonne.jpg'},{name:'mauvaise.heic',bad:true}];await h.get('studioPhotoInput').onchange();assert.equal(h.c.api.read().current.photos.length,0);assert.match(h.get('studioStatus').textContent,/illisible/);});
await test('UI réelle : saisie HTML reste du texte dans la conversation',async()=>{const h=await ui();h.input('<img src=x onerror=alert(1)>');await h.send();assert.equal(h.get('studioMessages').children[0].children[1],'<img src=x onerror=alert(1)>');assert.equal(h.get('studioMessages').children[0].children.some(x=>x.tagName==='IMG'),false);});
await test('UI réelle : sauvegarde réimportée sans effacer les autres travaux ni relancer le modèle',async()=>{const db=new TestDB();db.data.settings.set('noyauStandaloneJob-v1',{text:'Ancienne recherche'});const d=complete();d.studio.draft='Suite à conserver';await store.saveDossier(db,workshop.workshopState(null),d);const h=await ui({db});await h.get('backupStudio').onclick();const link=h.get('projectBackupLinks').children[0],blob=h.urls.get(link.href);h.get('restoreStudio').files=[blob];await h.get('restoreStudio').onchange();assert.equal(h.c.api.read().state.dossiers.length,2);assert.notEqual(h.c.api.read().current.id,d.id);assert.equal(h.get('studioInput').value,d.studio.draft);assert.equal(db.data.settings.get('noyauStandaloneJob-v1').text,'Ancienne recherche');});
await test('UI réelle : modifier un titre invalide immédiatement les anciens liens de livraison',async()=>{const db=new TestDB();await store.saveDossier(db,workshop.workshopState(null),complete());const h=await ui({db});await h.idle();h.get('approveStudio').checked=true;await h.get('prepareDelivery').onclick();assert.equal(h.get('delivery').hidden,false);h.input('Change le titre en Version corrigée');await h.send();await h.idle();assert.equal(h.get('delivery').hidden,true);assert.equal(h.get('deliveryLinks').children.length,0);assert.equal(h.get('approveStudio').checked,false);assert.equal(h.c.api.read().current.facts.title,'Version corrigée');});
await test('UI réelle : restauration dans un autre onglet bloque les écritures anciennes',async()=>{const db=new TestDB();const h=await ui({db});h.input('Description');await h.send();const old=structuredClone(h.c.api.read().state);const latest=structuredClone(old);latest.revision++;db.data.settings.set(workshop.WORKSHOP_KEY,latest);h.input('Nom non confirmé');await h.send();assert(h.c.api.read().blocked);assert.equal(h.get('studioInput').value,'Nom non confirmé');assert.equal(db.data.settings.get(workshop.WORKSHOP_KEY).revision,latest.revision);});

await test('UI : commande naturelle explicite, double envoi sans double calcul, candidats séparés puis adoption relue',async()=>{
 const counter={count:0},h=await savedUI(writingRunner(counter));const original=[...h.c.api.read().current.captions];assert.equal(counter.count,0);
 h.get('approveStudio').checked=true;await h.get('prepareDelivery').onclick();assert.equal(h.get('delivery').hidden,false);
 h.input('Améliore mes textes');await Promise.all([h.send(),h.send()]);assert.equal(counter.count,1);assert.equal(h.get('writingPanel').open,true);assert.equal(h.c.api.read().current.runs.length,1);assert.deepEqual([...h.c.api.read().current.captions],original);assert.equal(h.get('useWriting').hidden,false);
 await h.get('useWriting').onclick();await h.idle();assert.equal(h.c.api.read().current.captions[0],'Une présentation proposée par le modèle.');assert.equal(h.c.api.read().current.factsConfirmed,false);assert.equal(h.get('approveStudio').checked,false);assert.equal(h.get('delivery').hidden,true);
 h.get('approveStudio').checked=true;await h.get('prepareDelivery').onclick();assert.equal(h.get('delivery').hidden,false);assert(h.c.api.read().current.factsConfirmed);
});
await test('UI : résultat complet retrouvé et commande répétée sans nouveau calcul ni croissance des échanges',async()=>{
 const counter={count:0},h=await savedUI(writingRunner(counter));await h.get('writeStudio').onclick();const before=h.c.api.read().current.studio.messages.length;
 const reopened=await ui({db:h.db,runner:writingRunner(counter)});await reopened.idle();assert.equal(counter.count,1);assert.equal(reopened.get('useWriting').hidden,false);
 reopened.input('Améliore les textes');await reopened.send();assert.equal(counter.count,1);assert.equal(reopened.c.api.read().current.runs.length,1);assert.equal(reopened.c.api.read().current.studio.messages.length,before);assert.equal(reopened.get('studioInput').value,'');
});
await test('UI : interruption et réouverture gardent la première proposition et reprennent le même travail',async()=>{
 const counter={count:0},h=await savedUI(writingRunner(counter,{pauseAt:1}));await h.get('writeStudio').onclick();assert.equal(h.c.api.read().current.runs[0].writing.steps[0].status,'done');assert.equal(h.get('useWriting').hidden,true);
 const reopened=await ui({db:h.db,runner:writingRunner(counter)});await reopened.get('writeStudio').onclick();assert.equal(reopened.c.api.read().current.runs.length,1);assert.equal(reopened.c.api.read().current.runs[0].writing.steps[0].attempts,1);assert.equal(reopened.c.api.read().current.runs[0].writing.steps[1].attempts,2);assert.equal(reopened.get('useWriting').hidden,false);
});
await test('UI : modèle absent conserve la commande, les textes et le projet sans faux travail terminé',async()=>{
 const counter={count:0},h=await savedUI(writingRunner(counter,{absent:true})),before=[...h.c.api.read().current.captions];h.input('Améliore les textes');await h.send();assert.equal(h.get('studioInput').value,'Améliore les textes');assert.equal(h.c.api.read().current.runs.length,0);assert.deepEqual([...h.c.api.read().current.captions],before);assert.match(h.get('studioStatus').textContent,/Modèle absent/);
});
await test('UI : nouvelles informations excluent les propositions anciennes sans effacer leur preuve',async()=>{
 const counter={count:0},h=await savedUI(writingRunner(counter));await h.get('writeStudio').onclick();h.input('Change le titre en Nouvelle présentation');await h.send();assert.equal(h.get('useWriting').hidden,true);assert.equal(h.c.api.read().current.runs.length,1);await h.get('writeStudio').onclick();assert.equal(counter.count,2);assert.equal(h.c.api.read().current.runs.length,2);
});
await test('UI : message non envoyé empêche la rédaction de partir sur des informations périmées',async()=>{
 const counter={count:0},h=await savedUI(writingRunner(counter));h.input('Change le titre en Mon brouillon');await h.get('writeStudio').onclick();assert.equal(counter.count,0);assert.equal(h.get('studioInput').value,'Change le titre en Mon brouillon');assert.match(h.get('studioStatus').textContent,/Envoie d’abord/);
});
await test('UI : plafond des travaux arrête sans effacer l’historique ; occupation visible',async()=>{
 const db=new TestDB(),d=complete();for(let i=0;i<20;i++)d.runs.push(writing.newWritingRun('r'+i,{...d.facts,title:'Ancien '+i},MODEL.id,MODEL.revision));await store.saveDossier(db,workshop.workshopState(null),d);const counter={count:0},h=await ui({db,runner:writingRunner(counter)});await h.get('writeStudio').onclick();assert.equal(counter.count,0);assert.equal(h.c.api.read().current.runs.length,20);assert.match(h.get('studioStatus').textContent,/Vingt travaux/);await h.get('openProjects').onclick();assert.match(h.get('studioMemory').textContent,/1\/6 projets/);assert.match(h.get('studioMemory').textContent,/poids du modèle/);
});
await test('UI : demande de rédaction sans photo reste une consigne visible et ne calcule rien',async()=>{
 const db=new TestDB(),d=complete();d.photos=[];await store.saveDossier(db,workshop.workshopState(null),d);const counter={count:0},h=await ui({db,runner:writingRunner(counter)});h.input('Améliore les textes');await h.send();assert.equal(counter.count,0);assert.equal(h.get('studioInput').value,'Améliore les textes');assert.match(h.get('studioStatus').textContent,/photo/);
});


function patternedPhoto(){const c=createCanvas(120,80),ctx=c.getContext('2d');ctx.fillStyle='rgb(70,100,140)';ctx.fillRect(0,0,60,80);ctx.fillStyle='rgb(130,75,45)';ctx.fillRect(60,0,60,80);return{id:'pixel',name:'source.jpg',data:c.toDataURL('image/jpeg',.95),width:120,height:80};}
const pixel=(c,x,y)=>[...c.getContext('2d').getImageData(x,y,1,1).data];
await test('pixels réels : éclaircir change le PNG sans toucher la photo importée',async()=>{
 const p=patternedPhoto(),before=structuredClone(p),edited=photoCore.adjustedPhoto(p,'light'),original=await renderer.photoCanvas(p),after=await renderer.photoCanvas(edited);assert.deepEqual(p,before);assert.equal(edited.data,p.data);for(let i=0;i<3;i++)assert(pixel(after,20,30)[i]>pixel(original,20,30)[i]);const b=await renderer.canvasBlob(after);assert(b.size>100);assert.equal(b.type,'image/png');
 fs.mkdirSync(new URL('./a112-preserved-output/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./a112-preserved-output/photo-before.png',import.meta.url),original.toBuffer('image/png'));fs.writeFileSync(new URL('./a112-preserved-output/photo-after.png',import.meta.url),after.toBuffer('image/png'));
});
await test('pixels réels : noir et blanc, carré centré et rotation ont les dimensions attendues',async()=>{
 const p=patternedPhoto(),mono=await renderer.photoCanvas(photoCore.adjustedPhoto(p,'mono')),rgb=pixel(mono,20,30);assert.equal(rgb[0],rgb[1]);assert.equal(rgb[1],rgb[2]);
 const square=await renderer.photoCanvas(photoCore.adjustedPhoto(p,'square'));assert.equal(square.width,80);assert.equal(square.height,80);
 const rotated=await renderer.photoCanvas(photoCore.adjustedPhoto(p,'right'));assert.equal(rotated.width,80);assert.equal(rotated.height,120);const original=await renderer.photoCanvas(p);assert.deepEqual(pixel(rotated,50,20),pixel(original,20,30));
});
await test('retouches répétées : aucun empilement de fichiers, réglages bornés, retour source exact',async()=>{
 let p=patternedPhoto();const original=await renderer.photoCanvas(p),data=p.data;for(let i=0;i<100;i++)p=photoCore.adjustedPhoto(p,i%2?'mono':'enhance');assert.equal(p.data,data);assert(JSON.stringify(p.edit).length<150);assert.equal(Object.keys(p).length,6);p=photoCore.adjustedPhoto(p,'reset');const reset=await renderer.photoCanvas(p);assert.deepEqual(reset.toBuffer('image/png'),original.toBuffer('image/png'));assert(!('edit' in p));
});
await test('traitement découpé : une annulation arrête les pixels et conserve la source',async()=>{
 const p=photoCore.adjustedPhoto(patternedPhoto(),'light'),before=JSON.stringify(p),controller=new AbortController();let yields=0;await assert.rejects(renderer.photoCanvas(p,{signal:controller.signal,yieldFrame:async()=>{yields++;controller.abort();}}),/aborted/i);assert.equal(yields,1);assert.equal(JSON.stringify(p),before);
});
await test('exports : fiche et affiche reprennent la retouche ; aucun export muet de la source',async()=>{
 const d=complete();d.photos=[photoCore.adjustedPhoto(patternedPhoto(),'mono')];const before=JSON.stringify(d);assert.throws(()=>workshop.printableHTML(d),/photos retouchées/);const material=await renderer.photoDeliveryDossier(d),html=workshop.printableHTML(material);assert(html.includes('data:image/png'));assert(!html.includes(d.photos[0].data));assert.equal(JSON.stringify(d),before);assert(!material.photos[0].edit);
 const image=await renderer.poster(d,'vertical'),rgb=pixel(image,300,400);assert.equal(rgb[0],rgb[1]);assert.equal(rgb[1],rgb[2]);
});
await test('sauvegardes : source et réglages restaurés ensemble, consentement privé renouvelé',async()=>{
 const d=complete();d.photos=[photoCore.adjustedPhoto(patternedPhoto(),'square')];d.factsConfirmed=d.rightsConfirmed=true;const db=new TestDB();await store.saveDossier(db,workshop.workshopState(null),d);const raw=recovery.serializeBackup(await recovery.snapshot(db)),restored=new TestDB();await recovery.restoreBackup(restored,raw);const saved=restored.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0];assert.deepEqual(saved.photos,d.photos);const imported=core.importPrivateProject(core.exportPrivateProject(d),'restored');assert.deepEqual(imported.photos,d.photos);assert.equal(imported.factsConfirmed,false);assert.equal(imported.rightsConfirmed,false);assert.deepEqual((await renderer.photoCanvas(imported.photos[0])).toBuffer('image/png'),(await renderer.photoCanvas(d.photos[0])).toBuffer('image/png'));
});
await test('import : réglages inconnus, débordants ou cachant des données refusés',()=>{
 const d=complete();for(const extra of [{brightness:31},{rotation:45},{crop:'remote'},{data:'x'.repeat(10000)},{monochrome:'true'}]){d.photos[0].edit={...photoCore.photoEdit(null),...extra};assert.throws(()=>workshop.workshopState({schema:1,revision:0,dossiers:[d]}),/Réglages photo/);}
});
await test('commandes : formulation courante et numéro, aucun traitement partiel de demande composée',()=>{
 assert.deepEqual(photoCore.photoCommand('Peux-tu éclaircir la photo 2, stp'),{operation:'light',index:1});
 assert.deepEqual(photoCore.photoCommand('Peux-tu éclaircir la photo 2 stp ?'),{operation:'light',index:1});
 for(const text of ['Éclaircis la photo et enlève le fond','Change l’arrière-plan','Supprime le fond','Mets une maison sur ma photo'])assert.equal(photoCore.photoCommand(text)?.operation,'unsupported');assert.equal(photoCore.photoCommand('Améliore mes textes'),null);
});
await test('UI photo seule : retouche et PNG récupérable sans questionnaire ni modèle',async()=>{
 let modelCalls=0;const h=await ui({runner:async()=>modelCalls++});h.get('studioPhotoInput').files=[{name:'photo.jpg'}];await h.get('studioPhotoInput').onchange();await h.idle();const source=h.c.api.read().current.photos[0].data,oldLink=h.get('photoDownloads').children[0].href;
 h.input('Éclaircis la photo');await h.send();await h.idle();const d=h.c.api.read().current;assert.equal(d.facts.business,'');assert.equal(d.facts.details,'');assert.equal(d.photos[0].data,source);assert.equal(d.photos[0].edit.brightness,18);assert.equal(h.get('photoResult').hidden,false);assert.equal(h.get('photoSource').hidden,false);assert.equal(modelCalls,0);assert(!h.urls.has(oldLink));const link=h.get('photoDownloads').children[0],blob=h.urls.get(link.href);assert.equal(blob.type,'image/png');assert(link.download.endsWith('-retouchee.png'));
 const reopened=await ui({db:h.db});await reopened.idle();assert.equal(reopened.c.api.read().current.photos[0].edit.brightness,18);assert.equal(reopened.get('photoSource').hidden,false);
});
await test('UI : répétition du même réglage ne grossit pas les messages ni les photos',async()=>{
 const h=await savedUI();h.input('Éclaircis la photo');await Promise.all([h.send(),h.send()]);const before=h.c.api.read().current;h.input('Éclaircis la photo');await h.send();const after=h.c.api.read().current;assert.equal(after.studio.messages.length,before.studio.messages.length);assert.equal(after.photos.length,before.photos.length);assert.deepEqual(after.photos,before.photos);assert.equal(h.get('studioInput').value,'');
});
await test('UI : photo numérotée seule modifiée, sélection préservée',async()=>{
 const db=new TestDB(),d=complete();d.photos.push({...patternedPhoto(),id:'second'});await store.saveDossier(db,workshop.workshopState(null),d);const h=await ui({db});h.input('Mets la photo 2 en noir et blanc');await h.send();assert(!h.c.api.read().current.photos[0].edit);assert(h.c.api.read().current.photos[1].edit.monochrome);assert.match(h.get('photoResultTitle').textContent,/Photo 2/);h.input('Recadre la photo au carré');await h.send();assert.equal(h.c.api.read().current.photos[1].edit.crop,'square');assert(!h.c.api.read().current.photos[0].edit);
});
await test('UI : retouche sans source et commande composée conservées sans inventer des faits',async()=>{
 for(const text of ['Enlève le fond','Change le décor de la photo','Éclaircis la photo et supprime le fond']){const h=await ui();h.input(text);await h.send();assert.equal(h.get('studioInput').value,text);assert.equal(h.c.api.read().current.facts.details,'');assert.equal(h.c.api.read().current.studio.messages.length,0);assert.match(h.get('studioStatus').textContent,/photo à transformer|pas disponible/);}
});
await test('UI : titre contenant photo reste une correction de titre',async()=>{
 const h=await savedUI();h.input('Change le titre en Photo de la terrasse');await h.send();assert.equal(h.c.api.read().current.facts.title,'Photo de la terrasse');assert.equal(h.c.api.read().current.photos[0].edit,undefined);
});
await test('UI : échec de sauvegarde ne confirme pas une retouche non enregistrée',async()=>{
 const h=await savedUI();h.input('Éclaircis la photo');await h.c.api.queueDraft();h.db.failAfter=1;await h.send();assert.equal(h.c.api.read().blocked,true);assert.equal(h.db.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0].photos[0].edit,undefined);assert.equal(h.get('studioInput').value,'Éclaircis la photo');assert.equal(h.get('photoDownloads').hidden,true);
});
await test('UI : retouche annule la livraison précédente puis produit la nouvelle fiche cohérente',async()=>{
 const h=await savedUI();h.get('approveStudio').checked=true;await h.get('prepareDelivery').onclick();const old=h.get('deliveryLinks').children[0].href;h.input('Mets la photo en noir et blanc');await h.send();assert(!h.urls.has(old));assert.equal(h.get('approveStudio').checked,false);assert.equal(h.get('delivery').hidden,true);h.get('approveStudio').checked=true;await h.get('prepareDelivery').onclick();assert.equal(h.get('delivery').hidden,false);const htmlLink=h.get('individualFiles').children.find(a=>a.download?.endsWith('.html'));assert((await h.urls.get(htmlLink.href).text()).includes('data:image/png'));
});

await test('UI : restauration externe retire les anciens téléchargements photo et pack',async()=>{
 const h=await savedUI();h.get('approveStudio').checked=true;await h.get('prepareDelivery').onclick();const photoURL=h.get('photoDownloads').children[0].href,packURL=h.get('deliveryLinks').children[0].href;
 h.events['noyau-recovery'].onmessage({data:'RESTORED'});await h.idle();assert(h.c.api.read().blocked);assert(!h.urls.has(photoURL));assert(!h.urls.has(packURL));assert.equal(h.get('photoDownloads').hidden,true);assert.equal(h.get('delivery').hidden,true);assert.equal(h.get('prepareDelivery').disabled,true);
});


await test('UI étudiant : commande dans la même conversation, pas dans les faits, réouverture sans calcul',async()=>{
 const h=await ui();h.input('Étudie 5 minutes sur les images');await h.send();
 assert.equal(h.c.api.read().current.facts.details,'');assert.equal(h.get('studioInput').value,'');assert.equal(h.get('studySession').hidden,false);
 const state=h.db.data.settings.get(studyCore.STUDY_KEY);assert.equal(state.sessions.length,1);assert.equal(state.sessions[0].minutes,5);
 const reopened=await ui({db:h.db});assert.equal(reopened.get('studySession').hidden,false);assert.equal(reopened.db.data.settings.get(studyCore.STUDY_KEY).revision,state.revision);
});
await test('UI étudiant : le mode édition explicite garde la priorité',async()=>{
 const h=await savedUI(writingRunner({count:0}));await h.get('editTitle').onclick();h.input('Étudie 5 minutes');await h.send();assert.equal(h.c.api.read().current.facts.title,'Étudie 5 minutes');assert.equal(h.db.data.settings.has(studyCore.STUDY_KEY),false);
});
await test('UI étudiant : une durée invalide conserve le brouillon et ne crée pas de séance',async()=>{
 const h=await ui();h.input('Étudie 90 minutes');await h.send();assert.equal(h.get('studioInput').value,'Étudie 90 minutes');assert.equal(h.db.data.settings.has(studyCore.STUDY_KEY),false);assert.match(h.get('studioStatus').textContent,/1 et 30/);
});
await test('UI rédaction : méthodes relues figées dans un nouveau travail, sans remplacer les textes',async()=>{
 const db=new TestDB();await store.saveDossier(db,workshop.workshopState(null),complete());db.data.settings.set(learning.LEARNING_KEY,learning.retainLesson(null,'demandes client présentation textes','Garder les réserves explicites.','m1'));
 const h=await ui({db,runner:writingRunner({count:0})});await h.get('writeStudio').onclick();const d=h.c.api.read().current;assert.equal(d.runs[0].writing.methods[0].id,'m1');assert.notEqual(d.captions[0],d.runs[0].writing.steps[0].text);
});


function descendants(node){return [node,...node.children.filter(c=>typeof c==='object').flatMap(descendants)];}
function findStudy(h,text){const b=descendants(h.get('studySession')).find(n=>n.tagName==='BUTTON'&&n.textContent===text);assert(b,text);return b;}
async function reviewStudy(s,{save}){let r=structuredClone(s);r.status='running';r=studyCore.beginStudyItem(r,r.items[0].id,1000,now);r=studyCore.finishStudyItem(r,{answer:'faux',outputTokens:2,elapsedMs:5});r.status='review';await save(r);return r;}
await test('UI étudiant : brouillons de note et méthode retrouvés, acceptation explicite réutilisable',async()=>{
 const h=await ui({studyRunner:reviewStudy});h.input('Étudie 5 minutes');await h.send();let nodes=descendants(h.get('studySession'));const form=nodes.find(n=>n.className==='study-grade'),select=nodes.find(n=>n.id==='studyGrade'),note=form.children.find(n=>n.tagName==='TEXTAREA');select.value='4';note.value='Mon commentaire conservé';form.oninput();
 const method=nodes.find(n=>n.tagName==='TEXTAREA'&&n!==note);method.value='Méthode relue par moi.';method.oninput();
 assert.equal(findStudy(h,'Conserver cette méthode').disabled,true);
 // Saving the grade waits for queued draft writes before rerendering.
 await form.onsubmit({preventDefault(){}});assert.equal(findStudy(h,'Conserver cette méthode').disabled,false);await findStudy(h,'Conserver cette méthode').onclick();
 const m=h.db.data.settings.get(learning.LEARNING_KEY);assert.equal(m.lessons[0].answer,'Méthode relue par moi.');
 const reopened=await ui({db:h.db});nodes=descendants(reopened.get('studySession'));assert.equal(nodes.find(n=>n.id==='studyGrade').value,'4');assert(nodes.some(n=>n.tagName==='TEXTAREA'&&n.value==='Mon commentaire conservé'));assert.equal(reopened.db.data.settings.get(studyCore.STUDY_KEY).sessions[0].retained.length,1);
});
await test('UI étudiant : note saisie mais non soumise conservée après navigation et réouverture',async()=>{
 const h=await ui({studyRunner:reviewStudy});h.input('Étudie 5 minutes');await h.send();const nodes=descendants(h.get('studySession')),form=nodes.find(n=>n.className==='study-grade'),select=nodes.find(n=>n.id==='studyGrade'),note=form.children.find(n=>n.tagName==='TEXTAREA');select.value='2';note.value='Correction encore en cours';form.oninput();
 // A history action flushes the durable draft without submitting the grade.
 const history=nodes.find(n=>n.tagName==='BUTTON'&&n.textContent.includes('à relire'));await history.onclick();const reopened=await ui({db:h.db});const st=h.db.data.settings.get(studyCore.STUDY_KEY).sessions[0];assert.equal(st.grade,null);assert.equal(st.reviewDraft.comment,'Correction encore en cours');assert.equal(descendants(reopened.get('studySession')).find(n=>n.id==='studyGrade').value,'2');
});
await test('UI étudiant : stockage défectueux isolé sans rendre les projets inutilisables',async()=>{
 const db=new TestDB();db.data.settings.set(studyCore.STUDY_KEY,{schema:99});const h=await ui({db});h.input('Description d’une réalisation');await h.send();assert.equal(h.c.api.read().current.facts.details,'Description d’une réalisation');h.input('Étudie 5 minutes');await h.send();assert.equal(h.get('studioInput').value,'Étudie 5 minutes');assert.equal(db.data.settings.get(studyCore.STUDY_KEY).schema,99);
});

await test('UI image : création sauvegardée sans devenir une réalisation ni lancer le modèle',async()=>{
 const h=await ui();h.input('Crée une image de jardin');await h.send();const d=h.c.api.read().current;assert.equal(d.facts.details,'');assert.equal(d.studio.imageRequest.mode,'generate');assert.equal(d.studio.imageRequest.attempted,false);assert.equal(h.get('imageSession').hidden,false);assert.equal(h.get('studioInput').value,'');const reopened=await ui({db:h.db});assert.equal(reopened.c.api.read().current.studio.imageRequest.key,d.studio.imageRequest.key);
});
await test('UI image : source photo conservée et transformation préparée à part',async()=>{
 const h=await savedUI();const source=h.c.api.read().current.photos[0].data;h.input('Remplace le fond de la photo par une forêt');await h.send();const d=h.c.api.read().current;assert.equal(d.photos[0].data,source);assert.equal(d.studio.imageRequest.mode,'edit');assert.match(d.studio.imageRequest.sourceHash,/^[a-f0-9]{64}$/);assert.equal(d.studio.imageRequest.attempted,false);
});
await test('sauvegarde image : tentative conservée, aucune relance et rejet du brouillon invalide',async()=>{
 const d=complete();d.studio.imageRequest={schema:1,key:crypto.randomUUID(),projectId:d.id,prompt:'Crée une image de jardin',mode:'generate',photoId:null,sourceHash:null,attempted:true};const db=new TestDB();await store.saveDossier(db,workshop.workshopState(null),d);const raw=recovery.serializeBackup(await recovery.snapshot(db)),restored=new TestDB();await recovery.restoreBackup(restored,raw);assert.deepEqual(restored.data.settings.get(workshop.WORKSHOP_KEY).dossiers[0].studio.imageRequest,d.studio.imageRequest);const copy=core.importPrivateProject(core.exportPrivateProject(d),'new-copy');assert.equal(copy.studio.imageRequest.key,d.studio.imageRequest.key);const broken=structuredClone(d);broken.studio.imageRequest.prompt='x'.repeat(1801);assert.throws(()=>workshop.workshopState({schema:1,revision:0,dossiers:[broken]}));
});


await test('présentation ouverte : opinions et demande de mémoire passent au vrai dialogue sans modifier les faits',async()=>{
 for(const text of ['Je trouve ton idée intéressante, mais je ne suis pas convaincu.','Ça ne me plaît pas, discutons d’autre chose.','J’aimerais que tu te souviennes que je préfère les réponses courtes.']){
  const h=await ui();const before=structuredClone(h.c.api.read().current.facts);h.input(text);await h.send();assert.deepEqual(h.c.api.read().current.facts,before);assert.equal(h.db.data.settings.get('noyauStandaloneDialogue-v1').length,2);
 }
});
await test('un sujet d’étude hors catalogue reste une conversation, pas des exercices clients mal étiquetés',async()=>{
 assert.equal(studyCore.studyCommand('Étudie 30 minutes les mathématiques'),null);assert.equal(home.workMode('Étudie 30 minutes les mathématiques'),'deep');
 const h=await ui({presentation:false});h.input('Étudie 30 minutes les mathématiques');await h.send();assert.equal(h.db.data.settings.get(studyCore.STUDY_KEY),undefined);assert.equal(h.db.data.settings.get('noyauStandaloneDialogue-v1').length,2);
 assert.equal(studyCore.studyCommand('Étudie 10 minutes les photos').focus,'images');
});
await test('champ général à 4 000 caractères, retour au champ de projet préservé',async()=>{
 const h=await ui({presentation:false});assert.equal(h.get('studioInput').maxLength,4000);h.input('Prépare une présentation');await h.send();assert.equal(h.get('studioInput').maxLength,1800);
});

await test('A112 : continue reprend le dialogue interrompu même depuis une présentation ouverte',async()=>{
 const db=new TestDB();await store.saveDossier(db,workshop.workshopState(null),complete());
 db.data.settings.set('noyauStandaloneJob-v1',{id:'oldjob',homeProtocol:home.HOME_PROTOCOL,text:'Compare deux options',mode:'deep',model:MODEL.id,modelRevision:MODEL.revision,context:{localOnly:true},workControl:workBudget.initialWorkControl(),status:'paused',elapsedMs:0,attempts:1});
 const h=await ui({db,presentation:true}),before=structuredClone(h.c.api.read().current.facts);h.input('Continue');await h.send();assert.deepEqual(h.c.api.read().current.facts,before);assert.equal(db.data.settings.get('noyauStandaloneDialogue-v1')[0].content,'Compare deux options');assert.equal(db.data.settings.get('noyauStandaloneJob-v1'),null);
});
const report={release:'A112',at:new Date().toISOString(),scope:'Modules et handlers réels ; IndexedDB/DOM simulés, rendu PNG réel avec canvas natif Node. Aucune validation navigateur, iPhone ou LLM.',passed:tests.filter(t=>t.passed).length,failed:tests.filter(t=>!t.passed).length,tests};
fs.writeFileSync(new URL('./a112-preserved-studio.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,tests:tests.filter(t=>!t.passed)},null,2));
