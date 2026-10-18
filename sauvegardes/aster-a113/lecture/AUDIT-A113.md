# A113 — conversation, mémoire, reprise et comparaison

18 octobre 2026. Base effectivement ouverte : Sites version 27 / A112, commit `5eeccedf5b592563fec3113cbe0997928c799506`. Le résultat de publication Sites fait foi pour la nouvelle version en ligne. Même site privé, même origine, aucun changement du modèle sélectionné ou des poids.

## Ce qui change pour Fabien

La phrase ordinaire est envoyée au modèle même si un ancien dossier photo est ouvert. La saisie de faits d’une présentation demande une entrée explicite dans ce parcours ou une modification de champ. Les commandes photo, corrections de titre et livraisons existantes sont conservées. Les brouillons de présentation restent distincts du brouillon général.

Cocher les documents ne transforme plus un « Bonjour » en réponse fixe d’échec de recherche. Si aucun passage ne correspond, le modèle reçoit cette absence explicitement et peut converser normalement. Il doit signaler un document manquant plutôt que prétendre l’avoir lu.

Le rappel comprend les variantes « Mon prénom est… » / « Comment je m’appelle ? ». La dernière identité déclarée est prioritaire si plusieurs notes se contredisent. La mémoire reste une sélection bornée, non un entraînement des poids. Une correction jusqu’à 1 200 caractères n’est plus rejetée du rappel à cause d’une ancienne limite combinée de 850 caractères ; seule la question associée peut être présentée comme extrait.

Une demande mise de côté peut être sélectionnée avec son checkpoint, ses reçus, son temps et son budget autorisé. Le travail actif prend sa place dans les demandes mises de côté. Rien n’est relancé lors de la sélection. Un modèle incompatible ou des documents modifiés font refuser cette reprise, avec possibilité de recopier la demande.

## Mémoire et données bornées

- Conversation active : toujours 1 000 messages / 2 Mio. Réserve préalable de 384 Kio pour l’ensemble réponse, journal, provenance et extraits. Une réponse dépassant cette réserve est refusée avec conservation du point de reprise.
- « Ce que je retiens » propose **Archiver cette conversation et continuer**. Action explicite, transaction atomique, trois archives maximum et 6 Mio au total. Pas de rotation ni de purge automatique. Les archives restent lisibles par tranches de 40 messages et exportables. Les recherches d’anciens échanges peuvent les consulter.
- Les notes actives et le travail en pause restent en place lors d’un archivage. Les archives, corrections, nouveau résultat de comparaison et checkpoint sont inclus dans la sauvegarde complète et sa validation avant restauration. La sauvegarde globale garde sa borne existante de 40 Mio.
- Les demandes mises de côté gardent leur limite de 50. Elles peuvent être exportées ou retirées après deux clics explicites. Les conversations archivées ont le même retrait explicite. Aucun retrait de données utilisateur n’a été exécuté pendant cette livraison.
- Oubli daté : un ancien échange est exclu du contexte ; une nouvelle déclaration postérieure à l’oubli peut être utilisée. Modifier notes ou corrections invalide aussi les contextes et checkpoints des demandes archivées, pas seulement la demande active.
- Les marqueurs d’oubli restent limités à 128. Au-delà, les plus anciens sont condensés dans une date limite de rappel. Par prudence, les échanges antérieurs à cette date cessent d’alimenter les prompts, même si tout leur contenu n’avait pas été oublié ; ils restent consultables et exportables. Une fusion d’une ancienne sauvegarde ne peut pas réintroduire une note effacée. Les notes encore actives sont préservées.
- Comparaison : une seule campagne locale, huit réponses au maximum, 1 Mio. Pas d’historique illimité de campagnes. Elle n’écrit ni dans les notes personnelles ni dans le dialogue et n’alimente aucun entraînement.

## Utiliser le temps de manière plus utile

Le journal conserve tous les reçus autorisés. Le contexte final sélectionne au plus six éléments distincts. Jusqu’à deux contraintes repérées tôt (budget, échéance, obligation, interdiction) et les calculs choisis sont protégés contre une suppression silencieuse ; si les éléments obligatoires dépassent le contexte disponible, le calcul s’arrête explicitement. Cette sélection reste déterministe et lexicale, sans compréhension générale garantie.

Deux outils successifs sans élément nouveau arrêtent la recherche, même si leurs requêtes sont reformulées. Le bilan compte les extraits distincts. Une décision JSON inutilisable peut être réparée une fois ; cet essai compte dans les 25 décisions et ne donne aucun outil supplémentaire. Les anciennes demandes sans `workControl` gardent leur budget historique.

Un « J’ai vérifié le calcul : … » n’est accepté par le garde-fou que pour l’égalité exacte d’un reçu du calculateur. Certaines fausses affirmations de publication au passif sont également refusées. Ces règles ne détectent pas toutes les inventions du modèle.

Les limites restent quatre outils à la fois avec accord explicite pour prolonger, 24 outils au total par demande, contexte natif 4 096 tokens et 512/768 tokens de réponse. A111 reste le protocole de conversation et A112 celui de l’autorisation. A113 est une version logicielle. Une génération interrompue peut devoir recommencer ; les étapes sauvegardées et compatibles sont réutilisées.

## Mesure : ce qui a réellement été établi

Une fixture de 24 reçus montre que la sélection A112 des six derniers éléments perd la contrainte initiale ; la sélection A113 la conserve dans six éléments maximum. Trois copies du même passage comptent pour un seul élément. Une simulation d’outils reformulant la même recherche s’arrête après trois appels : un résultat nouveau, puis deux retours sans nouveauté. Voir `qa/a113-evidence-comparison.json` et les régressions.

**Cela mesure le comportement du logiciel, pas la qualité linguistique du modèle. Aucun vrai modèle local n’a été exécuté par l’agent dans cet environnement.**

La page privée `/comparaison.html`, accessible dans l’espace local → Réglages et mémoire, exécute le vrai moteur installé sur l’appareil après un clic explicite. Quatre demandes fictives sont traitées en direct et en approfondi : suivi de conversation, calcul, document et information absente. Le modèle et le contexte initial sont identiques pour chaque paire ; l’ordre alterne. Le mode approfondi peut utiliser ses outils et sa relecture ; ce protocole compare l’ensemble des deux méthodes, pas le seul nombre de tokens.

La campagne demande au plus quatre outils par cas, huit réponses, trente minutes de budget cumulé. Aucun accord de calcul supplémentaire n’est demandé dans cette petite mesure : une réponse est produite avec les résultats disponibles à la limite. Quitter la page met en pause ; reprise manuelle du checkpoint. Les durées incluent le chargement et les tentatives interrompues comptabilisées. Les tokens concernent uniquement les sorties de générations terminées ; ils excluent entrées et tokens interrompus non remontés.

Les repères textuels affichés ne constituent pas une note de qualité. Fabien peut donner 0–5 à chaque réponse. L’écart moyen est calculé uniquement sur les paires entièrement notées. Quatre cas synthétiques, une seule génération par mode, ordre alterné mais non randomisé : aucun résultat statistique ni équivalence avec un grand modèle ne peut en être déduit. Le fichier de mesures est exportable. Aucune mesure réelle de cet appareil n’est préremplie.

## Vérifications de livraison

- 77 contrôles conversation, pipeline, Worker et outils.
- 69 contrôles des fonctions conservées, routage intégré et exports PNG réels avec Canvas Node.
- 35 contrôles stockage partagé et restauration.
- 4 contrôles du shell hors ligne, imports locaux et conservation des caches de modèles.
- 26 régressions ciblées : prénom, longues corrections, 300 modifications de note, oubli daté, réserve UTF-8, archives, vrai checkpoint, double confirmation de retrait, nouveauté, JSON, calcul prouvé et campagne appariée.

**211 contrôles logiciels réussis.** Inférence, DOM, IndexedDB, Worker et services navigateur sont simulés aux frontières indiquées dans les suites. Le rendu PNG est réel. Aucun test physique iPhone, test Safari, mesure thermique ou preuve de qualité du LLM. Le parcours de comparaison utilise le runner réel dans l’application ; ses contrôles de livraison simulent l’inférence pour tester la persistance et les bornes.

Aucun secret, mémoire de téléphone ou poids n’est inclus dans le dépôt. Aucun téléchargement de modèle, service payant, image générative, entraînement des poids, automatisation récurrente, ouverture publique ou contact externe n’est activé par cette livraison.

## Essai proposé après actualisation

1. Dire « Bonjour, j’aimerais faire connaissance » puis poursuivre librement.
2. Dire « Retiens que mon prénom est Fabien », puis « Comment je m’appelle ? ».
3. Lancer une demande approfondie, la mettre en pause, commencer un autre échange, puis sélectionner le travail conservé et le reprendre.
4. Si souhaité, lancer la comparaison depuis les réglages, relire les réponses et donner les notes. Un résultat moins bon en approfondi reste un résultat utile : ne pas augmenter les ressources sans comprendre la régression.
