# A111 — conversation élargie et travail local adaptatif

18 octobre 2026. Base conservée : A110, commit `16c604352361d95debbb7e1d045b2a77d1f7822a`.

Fabien demande une mise à jour privée, une conversation naturelle avec davantage de contexte et un usage utile du temps supplémentaire, puis une sauvegarde du code sur GitHub. Cette livraison adapte le moteur d’orchestration autour du même modèle installé. Elle ne change pas ses poids.

## Changements livrés

| Point | A110 | A111 |
|---|---|---|
| Contexte natif demandé et contrôlé à READY | 1 024 jetons | 4 096 jetons |
| Sortie maximale | 256 jetons | 512 en conversation ; 768 en approfondi |
| Message utilisateur | 1 000 caractères | 4 000 caractères, conservés dans brouillon, demande, archive et sauvegarde |
| Échanges récents proposés au modèle | 6 messages | 12 messages ; retrait de paires entières si le vrai tokenizer l’exige |
| Rappel ancien | Corrections et méthodes choisies | En plus, deux anciens échanges pertinents retrouvés par mots du sujet |
| Mode approfondi | Petit plan fixe, réponse, contrôle de forme | Décisions d’outils locales, réponse, critique du contenu et correction ciblée éventuelle |
| Budget par lancement | 10 minutes | 10 minutes en direct, 30 en approfondi, chargement inclus |

Le budget est un maximum, pas un temps à remplir. La page masquée, une pause, une erreur ou un échec de sauvegarde arrêtent le Worker. La reprise reste manuelle.

## Travail adaptatif

`aster-work-core.js` et `aster-work-pipeline.js` fournissent quatre opérations en lecture seule :

1. `recall_conversation` : retrouver au plus deux passages d’anciens échanges ; les propos du modèle ne deviennent pas des faits vérifiés.
2. `search_documents` : rechercher des passages dans les seuls fichiers autorisés pour cette demande.
3. `read_document` : lire jusqu’à deux passages de 360 caractères à une position précise et indiquer la position suivante.
4. `calculate` : évaluer des nombres décimaux, parenthèses, addition, soustraction, multiplication et division, avec un parseur sans `eval`, sans noms de fonctions et sans accès réseau. Résultat arrondi à douze chiffres significatifs ; ce n’est pas de l’arithmétique de précision arbitraire.

Le modèle choisit une action structurée ou décide de répondre. Au plus huit décisions et huit appels d’outil par demande ; une répétition exacte ou un choix inexploitable arrête la recherche. Une décision non comprise conduit à une réponse avec les éléments disponibles, pas à une action inventée. Le journal sous la réponse expose ce qui a réellement été recherché et lu.

Chaque décision est conservée avant son outil ; chaque résultat est conservé avant l’étape suivante. Les accusés de réception attendent la transaction et sa relecture. La reprise saute les étapes terminées. Une action interrompue en lecture seule peut être reprise. Les calculs et lectures utiles restent des preuves d’exécution de ces outils, pas de la justesse globale du texte généré.

Le contexte inclut au plus les six derniers extraits d’outils. Les autres résultats restent dans le journal borné. Le budget de contexte retire des éléments facultatifs entiers ; la demande et la première preuve documentaire requise ne sont jamais coupées silencieusement. Les sources affichées proviennent de l’étape qui a rédigé la réponse, même si la critique ultérieure utilise moins de sources.

La critique est une inférence du même petit modèle, pas un juge indépendant. Elle peut détecter une contradiction ou en inventer une. Une correction ciblée et au plus une réparation de forme suivent si nécessaire. Au maximum douze générations dans un travail approfondi complet ; souvent moins. Aucun navigateur web, programme libre, modification du site ou téléchargement de modèle n’est ajouté.

## Continuité et données

Les 32 notes, 32 corrections choisies et 64 méthodes existantes restent dans leurs magasins d’origine. Pas de seconde histoire ni d’accumulation de résumés générés. L’historique garde son plafond de 1 000 messages / 2 Mio, les demandes interrompues leur plafond de 50. Les quotas et erreurs ne déclenchent aucune purge. Le journal d’une demande reste borné par huit résultats validés et un contrôle de taille à la reprise.

Une préférence oubliée est exclue du rappel ancien comme de l’historique récent. Certaines formulations naturelles explicites, dont « J’aimerais que tu te souviennes que… », enregistrent réellement une note et sa confirmation dans une même transaction. Les autres propos ne sont pas automatiquement promus en mémoire permanente.

Les documents ne sont utilisés qu’après activation explicite. L’empreinte SHA-256 du corpus sélectionné est figée avec la demande ; une modification du corpus interdit une nouvelle lecture dans cette ancienne demande. On n’enregistre pas tout le corpus dans chaque checkpoint. Une restauration concurrente bloque les résultats tardifs. Les brouillons de projet restent indépendants.

Les trois erreurs de routage reproduites dans l’audit A110 sont corrigées : une opinion, une invitation à discuter et une demande de mémoire ne deviennent plus des détails de présentation. Le routage des commandes reste en partie heuristique ; une modification explicite de champ conserve sa priorité. Les exercices étudiants préécrits ne sont plus présentés comme un apprentissage d’un sujet arbitraire : une demande hors catalogue reste une conversation.

Les estimations n’utilisent que des réponses A111 comparables, du même modèle et du même mode. Deux observations réelles sont nécessaires. Le chrono affiche le temps mesuré, pas un gain de qualité supposé.

## Vérifications effectuées

- 58 contrôles conversation / outils / protocole / reprises.
- 67 contrôles des fonctionnalités conservées : projets, photos, textes, études, préparation d’images, brouillons, sauvegardes.
- 35 contrôles du stockage partagé et des restaurations.
- 4 contrôles de fermeture des imports, copie hors ligne et conservation des caches.
- 26 fichiers JavaScript modifiés ou nouveaux vérifiés syntaxiquement ; `git diff --check` sans erreur.

Total : **164 contrôles logiciels réussis**. Les scripts et résultats sont dans `qa/test-a111-*.mjs` et `qa/a111-*.json`. Les PNG des tests sont produits avec Canvas natif Node. DOM, IndexedDB, réseau, moteur d’inférence et réponses du modèle sont simulés. Un scénario traverse les vrais gestionnaires Worker, le vrai pipeline et le vrai calculateur avec une inférence simulée. Un autre vérifie l’empreinte historique des anciens projets, pour conserver leurs réponses sans recalcul.

La compilation et la publication privées doivent utiliser le workflow Sites et son commit exact. La sauvegarde GitHub est une copie de code, pas une sauvegarde de la mémoire privée du téléphone.

## Limites à ne pas masquer

Pas d’inférence avec de vrais poids dans cet environnement, pas de test Safari/iPhone physique, pas de mesure de batterie, de température, de fluidité ou de qualité conversationnelle. Le modèle compact installé reste un petit modèle ; le choix JSON d’outil peut échouer et la relecture peut se tromper. Le contexte élargi consomme plus de mémoire et de calcul et doit être confirmé sur le téléphone. Le modèle est encore chargé à chaque nouveau lancement.

Le moteur d’image générative reste non configuré, les poids ne sont pas entraînés, le partage de calcul et le marché de projets ne sont pas actifs. Le site reste privé. Il n’est pas justifié d’annoncer une intelligence de grand modèle, des sentiments vécus ou un logiciel déjà commercialisable en autonomie générale.

## Première vérification utile sur le téléphone

Ouvrir la mise à jour et vérifier A111. Discuter librement, puis demander explicitement de retenir une préférence. Faire plusieurs échanges sur un autre sujet, puis revenir au premier. Pour un travail approfondi, importer un petit TXT contenant une quantité et un prix, demander de comparer des possibilités et de calculer un total. Lire le journal des outils sous la réponse. Vérifier le résultat à la main, puis corriger une réponse si besoin. Comparer cette même demande en réponse directe et en mode approfondi : pertinence, erreurs, informations réellement retrouvées, durée. Ce sera la première preuve d’un gain ou d’une régression de qualité sur le véritable appareil.
