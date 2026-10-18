# Sauvegarde Aster A111 — 18 octobre 2026

Source de la version privée A111, demandée par Fabien. Le projet GitHub historique est conservé. Cette branche ajoute seulement cette sauvegarde.

- Commit source Sites : `bd8feb65d5792464e6c7c5cf69b1b03a40f2833a`.
- Publication privée confirmée le 18 octobre 2026.
- Archive complète du code : [source-a111.tar.gz](source-a111.tar.gz), 360 fichiers source et manifeste d’intégrité.
- SHA-256 de l’archive : `d586e4da59b97570e2992843c83ceff2f7ebb2ab0a7dfb5f172bfd4450ec4cb5`.
- Git blob de l’archive : `23f05b108f27f465308626d1dc5604b01790a0eb`.
- [Audit A111](lecture/AUDIT-A111.md), [continuité](lecture/CONTINUITY.md), [instructions](lecture/AGENTS.md) et principaux fichiers modifiés sont directement consultables dans `lecture/`.
- Les 19 images, ZIP et pages de tests synthétiques régénérables sont exclus de l’archive et listés dans le manifeste. Aucun code source n’est exclu.
- La copie contient le code, ses dépendances déclarées, le runtime WASM, les tests et les rapports. Elle ne contient ni les conversations privées du téléphone, ni ses photos, ni ses poids téléchargés, ni des clés réelles ou jetons d’accès.

## Reprise

Télécharger l’archive, vérifier son SHA-256 puis l’extraire :

```sh
sha256sum source-a111.tar.gz
tar -xzf source-a111.tar.gz
cd aster-a111
```

Lire d’abord `AUDIT-A111.md`, `CONTINUITY.md` et `AGENTS.md`. `SOURCE-MANIFEST.json` donne l’empreinte de chaque fichier issu du commit source exact. Le dossier `lecture/` est un extrait de consultation ; l’archive est la copie à utiliser pour reprendre l’ensemble du logiciel.

Les scripts `qa/test-a111-*.mjs` reproduisent les 164 contrôles logiciels (avec limites de simulation documentées). Le test Canvas demande `@napi-rs/canvas` et le runtime Codex indiqué dans son script. La publication doit suivre le workflow Sites du propriétaire, en conservant l’accès privé. Ne pas confondre cette sauvegarde avec un déploiement public ou avec la sauvegarde des données du navigateur.

## Résultat et limite

Contexte 4 096, messages 4 000 caractères, réponses 512/768 jetons, mémoire récente et recherche d’anciens échanges. Le mode approfondi peut choisir jusqu’à huit recherches locales, vérifier des calculs, puis rédiger et relire. Le modèle et ses poids restent identiques ; aucune qualité de grand modèle, image générative active ou capacité d’auto-modification n’est certifiée. La vérification physique sur le téléphone reste à faire.
