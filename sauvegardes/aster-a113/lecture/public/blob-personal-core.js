// Device-private dialogue ledger. It never modifies strategies, receipts or model weights.
export const PERSONAL_SCHEMA='noyau-personal-v1';
export const PERSONAL_BUDGET=1048576;
export const personalNorm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const copy=x=>JSON.parse(JSON.stringify(x));
const sources=new Set(['USER','LOCAL_CONTEXT','LOCAL_LLM_DIALOGUE','LOCAL_MEMORY','LOCAL_RULES','NOTICE','LEGACY']);
export function personalState(raw){
 if(!raw)return {schema:PERSONAL_SCHEMA,activeId:null,threads:[],notes:[]};
 if(raw.schema!==PERSONAL_SCHEMA||!Array.isArray(raw.threads)||raw.threads.length>64||!Array.isArray(raw.notes)||raw.notes.length>32)throw Error('PERSONAL_MEMORY_INVALID');
 const state=copy(raw);state.forgotten=state.forgotten||[];
 if(state.forgottenBefore!=null&&(!Number.isFinite(state.forgottenBefore)||state.forgottenBefore<0))throw Error('PERSONAL_FORGOTTEN_INVALID');
 if(!Array.isArray(state.forgotten)||state.forgotten.length>128||state.forgotten.some(n=>typeof n.key!=='string'||n.key.length>500||!Number.isFinite(n.at)))throw Error('PERSONAL_FORGOTTEN_INVALID');
 for(const t of state.threads){
  if(typeof t.id!=='string'||t.id.length>80||typeof t.title!=='string'||t.title.length>90||!Array.isArray(t.messages)||t.messages.length>256)throw Error('PERSONAL_THREAD_INVALID');
  for(const m of t.messages)if(!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>5000||!sources.has(m.source)||!Number.isFinite(m.at))throw Error('PERSONAL_MESSAGE_INVALID');
 }
 if(new Set(state.threads.map(t=>t.id)).size!==state.threads.length)throw Error('PERSONAL_THREAD_DUPLICATE');
 for(const t of state.threads)for(const m of t.messages)if(m.feedback&&(!['useful','rejected'].includes(m.feedback.value)||!Number.isFinite(m.feedback.at)))throw Error('PERSONAL_FEEDBACK_INVALID');
 for(const n of state.notes)if(typeof n.text!=='string'||!n.text.trim()||n.text.length>500||!Number.isFinite(n.at)||n.source!=='OWNER')throw Error('PERSONAL_NOTE_INVALID');
 if(JSON.stringify(state).length>PERSONAL_BUDGET)throw Error('PERSONAL_MEMORY_QUOTA');
 if(!state.threads.some(t=>t.id===state.activeId))state.activeId=state.threads.at(-1)?.id||null;
 return state;
}
export function personalThread(raw){const s=personalState(raw);return s.threads.find(t=>t.id===s.activeId)||null;}
export function newPersonalThread(raw,at=Date.now()){
 const s=personalState(raw);
 // Repeated New clicks reuse the current empty exchange; existing messages are preserved.
 if(s.threads.some(t=>t.id===s.activeId&&t.messages.length===0))return s;
 if(s.threads.length>=64)throw Error('PERSONAL_THREAD_QUOTA');
 let id='t-'+at.toString(36)+'-'+s.threads.length;while(s.threads.some(t=>t.id===id))id+='x';
 s.threads.push({id,title:'Nouvel échange',at,messages:[]});s.activeId=id;return s;
}
export function appendPersonal(raw,role,content,source,at=Date.now()){
 let s=personalState(raw);if(!s.activeId)s=newPersonalThread(s,at);
 const t=s.threads.find(t=>t.id===s.activeId);
 if(t.messages.length>=256)throw Error('PERSONAL_MESSAGE_QUOTA');
 t.messages.push({role,content,source,at});t.at=at;
 if(role==='user'&&t.title==='Nouvel échange')t.title=content.replace(/\s+/g,' ').slice(0,80);
 return personalState(s);
}
// After 128 removals, compact the oldest deletion markers without deleting the saved history.
function compactForgotten(state){
 const all=[...(state.forgotten||[])].sort((a,b)=>b.at-a.at);
 if(all.length>128)state.forgottenBefore=Math.max(state.forgottenBefore||0,...all.slice(128).map(n=>n.at));
 state.forgotten=all.slice(0,128);return state;
}
export function forgottenExchange(rows,forgotten=[],before=0){
 const at=Math.max(0,...rows.map(m=>m.correction?.reuse?(Date.parse(m.correction.at)||0):(Number.isFinite(m.at)?m.at:(Date.parse(m.savedAt)||0))));
 if(before>0&&at<=before)return true;
 const text=personalNorm(rows.map(m=>m.content).join(' '));
 return forgotten.some(n=>at<=(Number.isFinite(n.at)?n.at:Infinity)&&text.includes(n.key));
}
export function mergePersonal(a,b){
 const left=personalState(a),right=personalState(b),threads=new Map(left.threads.map(t=>[t.id,t]));
 for(const incoming of right.threads){const existing=threads.get(incoming.id);if(!existing){threads.set(incoming.id,incoming);continue;}
  const key=m=>JSON.stringify([m.role,m.content,m.at]),rows=new Map(existing.messages.map(m=>[key(m),m]));for(const m of incoming.messages){const old=rows.get(key(m));if(!old||(m.feedback?.at||0)>=(old.feedback?.at||0))rows.set(key(m),m);}
  existing.messages=[...rows.values()].sort((a,b)=>a.at-b.at);if(incoming.at>=existing.at){existing.at=incoming.at;existing.title=incoming.title;}
 }
 const removed=new Map((left.forgotten||[]).map(n=>[n.key,n]));for(const n of right.forgotten||[]){if(!removed.has(n.key)||n.at>removed.get(n.key).at)removed.set(n.key,n);}
 const notes=new Map(left.notes.map(n=>[personalNorm(n.text),n]));for(const n of right.notes){const old=notes.get(personalNorm(n.text));if(!old||n.at>=old.at)notes.set(personalNorm(n.text),n);}
 return personalState(compactForgotten({schema:PERSONAL_SCHEMA,activeId:right.activeId,threads:[...threads.values()].sort((a,b)=>a.at-b.at),notes:[...notes.values()].filter(n=>(!removed.has(personalNorm(n.text))||n.at>removed.get(personalNorm(n.text)).at)&&[left,right].every(side=>!(side.forgottenBefore>0)||n.at>side.forgottenBefore||side.notes.some(x=>personalNorm(x.text)===personalNorm(n.text)&&x.at>=n.at))).sort((a,b)=>a.at-b.at),forgotten:[...removed.values()],forgottenBefore:Math.max(left.forgottenBefore||0,right.forgottenBefore||0)}));
}
export function migratePersonalSession(raw,messages,at=Date.now()){
 let s=personalState(raw);if(s.threads.length||!Array.isArray(messages)||!messages.length)return s;
 s=newPersonalThread(s,at);
 for(const m of messages.slice(-8))if(m&&['user','assistant'].includes(m.role)&&typeof m.content==='string'&&m.content.trim()&&m.content.length<=1200)s=appendPersonal(s,m.role,m.content,m.role==='user'?'USER':'LEGACY',at++);
 return s;
}
export function ownerNote(text){
 if(typeof text!=='string')return null;
 const m=text.trim().replace(/\s+/g,' ').match(/^(?:retiens(?: que)?|souviens[- ]toi(?: que)?|remember(?: that)?)\s*[:,-]?\s+(.+)$/i);
 return m&&m[1].trim().length<=500?m[1].trim():null;
}
export function rememberPersonalNote(raw,text,at=Date.now()){
 const s=personalState(raw),key=personalNorm(text);if(!key||text.length>500)throw Error('PERSONAL_NOTE_BOUNDS');
 const found=s.notes.find(n=>personalNorm(n.text)===key);if(found){found.at=at;return s;}
 if(s.notes.length>=32)throw Error('PERSONAL_NOTE_QUOTA');s.notes.push({text:text.trim(),source:'OWNER',at});return personalState(s);
}
const tokens=s=>new Set(personalNorm(s).split(' ').filter(w=>w.length>3&&!['avec','dans','pour','quoi','comment','quelle','quelles','quand','est','sont','plus','veux','faire','your','what','that','this','deux','trois','quatre','phrase','phrases'].includes(w)));
export function relevantPersonalNotes(raw,text){
 const s=personalState(raw),q=tokens(text),query=personalNorm(text);
 const identity=n=>/\b(?:je m appelle|mon (?:pre)?nom (?:est|c est)|appelle moi)\b/.test(personalNorm(n.text));
 const language=n=>/\b(?:ma langue|je parle|reponds moi en|repondre en)\b/.test(personalNorm(n.text));
 const chosen=s.notes.filter(n=>![identity,language].some(kind=>kind(n)&&s.notes.some(other=>kind(other)&&other.at>n.at)));
 const nameQuery=/\b(?:prenom|nom|appelle|qui suis je|connaissance)\b/.test(query);
 const ranked=chosen.map(n=>({n,score:[...tokens(n.text)].filter(w=>q.has(w)).length+(identity(n)?(nameQuery?20:1):0)+(language(n)?1:0)}));
 return ranked.filter(x=>x.score||/(?:prefere|francais|english|reponse|reponses)/.test(personalNorm(x.n.text))).sort((a,b)=>b.score-a.score||b.n.at-a.n.at).slice(0,3).map(x=>({text:x.n.text,source:'OWNER'}));
}
export function personalPromptHistory(raw,since=0){
 const state=personalState(raw),t=personalThread(state);if(!t)return [];
 const removed=m=>forgottenExchange([m],state.forgotten,state.forgottenBefore);
 const pairs=[];
 for(let i=0;i<t.messages.length-1;i++){const a=t.messages[i],b=t.messages[i+1];if(a.role==='user'&&b.role==='assistant'&&b.source!=='NOTICE'&&b.source!=='LEGACY'&&b.feedback?.value!=='rejected'&&(b.source!=='LOCAL_LLM_DIALOGUE'||b.at>=since)&&!removed(a)&&!removed(b))pairs.push(a,b);}
 return pairs.slice(-6).map(m=>({role:m.role,content:m.content}));
}
export const PROJECT_KNOWLEDGE=[
 {id:'architecture',title:'Les deux cerveaux',terms:'fonctionnement organisation projet cerveau cerveaux iphone serveur architecture role roles',text:'Noyau Personnel est l’interface de dialogue privée du projet Noyau/Blob. Le téléphone conserve les échanges et préférences, fait tourner le modèle local et cherche des plans. Le serveur orchestre les cycles, vérifie les résultats et conserve le cerveau canonique. Le modèle ne reçoit que les informations pertinentes et autorisées ; il ne remplace pas les vérificateurs.'},
 {id:'learning',title:'Comment le Blob apprend',terms:'candidat candidats champion champions preuve preuves validation validations recette recettes apprendre apprentissage evoluer evolutif evolution progres exercice exercices entrainement strategie programme',text:'Une recette crée un exercice neuf. Le moteur cherche des plans bornés, les compare et soumet leurs résultats à des validations indépendantes. Il conserve les plans vérifiés et réutilise cette mémoire sur de nouveaux cas. Un candidat reste distinct d’un champion. Un téléchargement, une durée ou une réponse du LLM ne certifie aucune capacité.'},
 {id:'memory',title:'Mémoire privée et plans',terms:'memoire memoriser souvenir souvenirs conversations echanges conserver recalculer preferences',text:'Les échanges et notes du propriétaire restent dans le stockage local de cet appareil. Les stratégies sont séparées : candidat, champion, preuves et archives. Une préférence personnelle n’est jamais une preuve. Le serveur conserve ses reçus et le cerveau canonique ; les poids du modèle ne sont pas entraînés par les conversations.'},
 {id:'network',title:'Le réseau visé',terms:'reseau entraide contribution contribuer mine minage credits points partage marche futur objectif objectifs',text:'L’objectif est un réseau privé d’entraide : contribution de calcul, projets et services utiles vérifiés. Les contributions sont mesurées, mais paiements, crédits dépensables et marché public ne sont pas activés. Le mode partagé 50/50 est une direction du projet, pas une marge ou une récompense garantie.'},
 {id:'model',title:'Le langage local',terms:'modele llm qwen smollm fusion fusionne poids nom intelligent intelligence assistant personnel prive',text:'L’assistant utilise une base de langage téléchargée avec une révision précise et exécutée localement. Son identité, son contexte et ses préférences sont adaptés au Noyau. Ses poids ne sont pas fusionnés ou réentraînés par les cycles. Le modèle peut répondre librement, mais ses réponses restent à vérifier.'},
 {id:'priority',title:'Priorités de progrès',terms:'amelioration ameliorer propose proposer conseil conseille prochaine prochain priorite suite reparer',text:'Avant d’annoncer un progrès, comparer des cas indépendants et la rétention. Réparer les compétences dégradées, conserver les champions, puis explorer de nouveaux plans. Pour le dialogue : français pertinent, suivi d’une conversation, mémoire utile et accès aux faits du projet. Ne jamais fabriquer une promotion ni diminuer les seuils.'},
 {id:'sessions',title:'Sessions productives A65',terms:'session bilan cycle deux heures longtemps productivite rentable rentabilite gains mesurer mesure checkpoint',text:'Assistant → Session productive conserve un départ, des comparaisons espacées de cinq minutes et un bilan final observé. « Bilan de session » lit ces mesures. Les certifications portent sur le même hash de recette, le même ordre et masque, avec trois graines distinctes. Un compteur de validations ne mesure pas une nouvelle intelligence. Trois relevés sans progrès recommandent une nouvelle tâche ou un arrêt. Sources : blob-session-core.js, blob-session.js.'},
 {id:'privacy',title:'Confidentialité et sauvegarde A65',terms:'memoire confidentialite confidentiel confidentielle secret prive privee cryptage chiffrement chiffre chiffree chiffrer crypte cryptee sauvegarde restaurer securite',text:'Le site est privé et les API du cerveau réservées au propriétaire. Les échanges, notes et documents sont conservés dans le navigateur ; ils ne sont pas envoyés à un LLM distant. Leur stockage actif n’est pas chiffré par l’application. Une sauvegarde AES-256-GCM avec phrase secrète est exportable puis restaurable par fusion ; la phrase n’est pas conservée. Un fichier demandé est envoyé au vérificateur privé pour sa preuve. Sources : blob-private-vault.js, blob-private-backup.js, api/blob/service.js.'},
 {id:'actions',title:'Actions disponibles A65',terms:'outils action actions bulles connexion connecte projet expert plan feuille route architecture modifier coder executer',text:'« Décompose : … » recherche une méthode dans la bibliothèque locale et conserve un plan dont chaque étape a un contrôle. « Lance ce plan » exécute la méthode disponible (fichier, lecture de bilan ou réponse approfondie). Un outil absent est signalé. Dix méthodes sont disponibles, dont quatre circuits bornés : comparaison, diagnostic, feuille de route et synthèse de sources. Les résultats intermédiaires attendent une sauvegarde confirmée avant la suite ; une reprise compatible les réutilise. Ce calcul est classique, sans puce quantique ni nouveaux poids. Les bulles du plan de session sont : point de départ → priorités → recherche et vérification → comparaison → checkpoint. Elles relient des exécutants fixes. Les commandes « Plan du projet », « Bilan de session », « Dernier résultat » et « Traite ce fichier » utilisent ces outils. Les propositions de code restent du texte ; aucune exécution arbitraire ni modification autonome des sources. Les checkpoints du développement sont dans le dépôt privé. Sources : blob-session-core.js, blob-work-core.js.'},
 {id:'quality',title:'Qualité du dialogue A65',terms:'qualite reponse minutes lent gros grand modele approfondie raisonnement strategie temps intelligence generaliste',text:'Le langage local est Qwen2.5-1.5B-Instruct Q4_K_M, contexte 2048 jetons. Approfondie prépare un plan court puis une réponse et effectue au maximum une correction ciblée si les contrôles de forme ou de sortie échouent. Ce contrôle ne vérifie pas la vérité de tous les faits. Le temps supplémentaire ne garantit pas la qualité d’un plus gros modèle. Les poids restent identiques. Sources : blob-assistant-worker.js, blob-answer-review.js.'},
 {id:'longrun',title:'Priorité du calcul connecté A65',terms:'continue continuer automatique automatisme repetitif repeter apprentissage tache arriere plan safari',text:'Les cycles connectés donnent quatre occasions sur cinq aux parcours adaptatifs ; une sur cinq conserve le parcours canonique. Si les recherches adaptatives sont en attente, le prochain essai est espacé. Un dialogue réserve le calcul local puis le libère ; Safari peut suspendre les calculs en arrière-plan, alors que le serveur poursuit son cycle. Les modèles complets sont réutilisés. Sources : index.html, blob-curriculum-memory.js, blob-work-schedule.js.'}
];
export function projectKnowledge(text,history=[]){
 const recent=history.filter(m=>m.role==='user').slice(-2).map(m=>m.content).join(' '),q=tokens(text),past=tokens(recent);
 return PROJECT_KNOWLEDGE.map(k=>({k,score:[...tokens(k.terms)].reduce((n,w)=>n+(q.has(w)?3:past.has(w)?1:0),0)})).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,2).map(({k})=>({id:k.id,title:k.title,text:k.text,source:'PROJECT_SPEC',version:'A65.1',reviewedAt:'2026-10-06'}));
}

// Owner feedback changes retrieval only; originals remain in the conversation.
export function reviewPersonalMessage(raw,threadId,at,value,now=Date.now()){
 if(!['useful','rejected'].includes(value))throw Error('PERSONAL_FEEDBACK_INVALID');
 const s=personalState(raw),m=s.threads.find(t=>t.id===threadId)?.messages.find(m=>m.at===at&&m.role==='assistant');
 if(!m||m.source!=='LOCAL_LLM_DIALOGUE')throw Error('PERSONAL_MESSAGE_NOT_FOUND');
 m.feedback={value,at:now};return personalState(s);
}
export function replacePersonalNote(raw,previous,next,at=Date.now()){
 let s=personalState(raw);if(!s.notes.some(n=>n.text===previous))throw Error('PERSONAL_NOTE_NOT_FOUND');
 const key=personalNorm(previous),forgotten=new Map((s.forgotten||[]).map(n=>[n.key,n]));forgotten.set(key,{key,at});
 s.forgotten=[...forgotten.values()];s=compactForgotten(s);s.notes=s.notes.filter(n=>personalNorm(n.text)!==key);
 if(next.trim())s=rememberPersonalNote(s,next.trim(),at+1);return personalState(s);
}

