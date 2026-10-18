# A112 — poursuivre un travail avec l’accord du propriétaire

18 octobre 2026. Base : A111, `bd8feb65d5792464e6c7c5cf69b1b03a40f2833a`, version Sites 26.

Fabien souhaite une conversation naturelle et des travaux plus longs, avec un bilan intermédiaire et la possibilité d’autoriser davantage de calcul. Cette livraison modifie l’orchestration locale. Les poids, le modèle sélectionné, le contexte natif de 4 096 jetons et les réponses de 512/768 jetons restent ceux d’A111.

## Comportement livré

- Une nouvelle demande approfondie commence avec quatre appels d’outils autorisés. Le modèle peut répondre avant de les utiliser.
- S’il choisit une cinquième action nouvelle, sa décision est enregistrée, sans exécution de cet outil. L’interface montre les opérations terminées, les derniers extraits ou résultats à vérifier et l’action proposée. Le Worker est libéré pendant l’attente.
- « Continuer · 4 étapes maximum » autorise quatre outils de plus. « Répondre maintenant » demande une synthèse des éléments déjà obtenus. Les messages « Oui, continue », « Reprends ce travail » et « Réponds maintenant » commandent aussi la demande active, sans créer un nouveau travail ni archiver l’original.
- Un accord est enregistré et relu avant le lancement. Une fermeture immédiatement après cet accord ne provoque pas une seconde augmentation lors de la reprise.
- Maximum 24 outils par demande, cinq prolongations. Choix d’outil : au plus 128 jetons par inférence, 25 décisions maximum. La réponse et les relectures conservent leurs bornes A111. Le temps reste limité à 30 minutes par lancement approfondi, chargement inclus ; une reprise explicite ouvre un nouveau lancement. Il ne s’agit pas d’un plafond de 30 minutes pour toute la vie d’une demande.
- Deux recherches successives sans preuve retournée, une action répétée à l’identique, un choix inexploitable ou la décision de répondre arrêtent la recherche. Ce contrôle ne mesure pas la pertinence réelle d’une preuve et ne garantit pas que toutes les étapes ont été utiles.
- Le chronomètre reste mesuré. Le compteur cumulatif affiche les jetons de sortie des générations terminées ; il n’inclut pas les jetons d’entrée ni une génération interrompue avant son signal de fin. Ce n’est ni une facture ni une mesure d’intelligence.

Le bilan d’attente provient des résultats des outils, avec une formulation déterministe. Ce n’est pas une réflexion libre supplémentaire du modèle ni une réponse finale. Le modèle continue de choisir les outils et de rédiger les réponses. Les commandes de reprise sont reconnues par des règles étroites ; la discussion ordinaire passe au modèle de langage.

## Interruptions et simplicité

La page masquée ou fermée met le calcul local en pause. Elle ne transforme plus visuellement une pause en travail terminé. Au retour, les étapes enregistrées sont proposées à la reprise manuelle ; aucun nouveau téléchargement ou calcul automatique. Une génération interrompue au milieu d’une étape peut devoir recommencer cette étape. Les étapes déjà confirmées ne sont pas refaites.

Le champ est encore indisponible pendant un calcul actif ; les bilans et jetons s’affichent et le bouton de pause reste disponible. L’utilisateur répond à la demande d’accord une fois le bloc arrêté. Ce n’est pas une seconde conversation simultanée avec un Worker en arrière-plan.

Les demandes A111 existantes conservent leur protocole et leurs limites historiques de huit décisions. Le nouveau contrôle `aster-work-A112` n’est ajouté qu’aux nouvelles demandes approfondies. Les empreintes de reprise des anciens projets et conversations ne changent pas. Le dialogue général reste sur le protocole A111 compatible ; A112 est la version de l’interface et du contrôle de budget, pas un nouveau modèle.

## Mémoire et autorisations

Le journal nouveau est borné à 24 résultats, avec un plafond de 96 000 octets UTF-8 vérifié lors des écritures et restaurations. Il reste dans la demande puis sous la réponse, sans second historique. Les six derniers extraits au plus sont proposés au contexte ; les autres restent consultables dans le journal après la réponse.

Les limites existantes restent : 32 notes personnelles, 32 corrections, 1 000 messages / 2 Mio de conversation et 50 demandes interrompues. Aucun effacement automatique pour libérer de la place. Modifier la mémoire ou les corrections invalide le contexte et remet le budget à quatre outils pour la prochaine reprise.

Le modèle ne peut pas modifier son autorisation. Le runner vérifie le protocole de budget et refuse les outils au-delà de l’autorisation restante, indépendamment du pipeline. Les outils restent limités à la lecture du corpus choisi, au rappel d’anciens échanges et au calcul décimal. L’empreinte des documents et les révisions de conversation continuent de bloquer les accès périmés.

La lecture du site a montré zéro automatisation attachée à ce site. Cela ne constitue pas un audit de toutes les tâches ou conversations du compte. Aucun contenu privé du téléphone n’a été lu. Les problèmes de quota ou de règles propres aux données du téléphone ne peuvent pas être déclarés résolus sans reproduction.

## Vérifications

- 77 contrôles conversation, pipeline, Worker, outils et reprise.
- 68 contrôles des fonctions conservées et du routage, avec exports PNG natifs Node.
- 35 contrôles du stockage partagé et des restaurations.
- 4 contrôles de la copie hors ligne et de fermeture des imports.

Total : **184 contrôles logiciels réussis**, avec inférence, DOM et IndexedDB simulés. Le test Worker A112 traverse les vrais gestionnaires et le vrai calculateur : quatre outils, cinq décisions, checkpoint d’attente, aucune synthèse ni activation finale. Les autres contrôles couvrent le plafond 24, le refus sans accord, l’arrêt sans progrès, le choix de répondre maintenant, la reprise après accord interrompu, le quota avant accord, les anciennes identités et les restaurations.

Pas de test physique iPhone, de vrai modèle chargé ou de mesure de qualité conversationnelle. La compilation et la publication sont vérifiées par le workflow Sites. Le code est destiné à la sauvegarde GitHub, sans mémoire privée, identifiants de connexion ou poids.

## Ce qui reste à établir

Le petit modèle peut discuter librement, mais ses réponses et ses décisions d’outils peuvent être mauvaises. Du temps supplémentaire offre des recherches, des calculs et une relecture ; cela n’ajoute aucun paramètre et ne prouve pas une équivalence avec un grand modèle. Le modèle se recharge à chaque lancement. Aucun entraînement des poids, moteur d’image actif, réseau de partage de puissance ou sentiment vécu n’est ajouté.

Essai utile : ouvrir A112, dire « Faisons connaissance. Pose-moi une question à la fois », puis demander de retenir une préférence. Pour tester la durée, utiliser un vrai petit document TXT/MD et une question qui demande plusieurs passages ou calculs. Vérifier la réponse, le journal, la pause puis la reprise. Le fait qu’une réponse arrive vite sans demande d’accord n’est pas une panne : le modèle peut estimer qu’aucune recherche supplémentaire n’est utile.
