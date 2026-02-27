# Fractality — Bugs & Correctifs

---

## BUG-001 — Session de travail perdue à la fermeture de l'app

**Statut** : 🔴 À corriger

### Description
Quand on lance un chronomètre de session de travail et qu'on ferme l'app (ou l'onglet), la session disparaît complètement. À la réouverture, aucune session en cours n'est détectée et le chronomètre repart de zéro.

### Cause racine
Le composant `WorkTimer` stocke le temps écoulé uniquement dans un `useState` React — aucune persistance dans Dexie. La session `WorkSession` n'est créée en base qu'au moment où l'utilisateur clique Stop **et** valide le formulaire. Fermer la fenêtre entre ces deux étapes = perte totale.

### Solution retenue
1. **Nouveau champ `startedAt`** (ISO string) et **`status: 'in_progress' | 'completed'`** dans le schéma `WorkSession` + migration Dexie v15.
2. **Au clic Démarrer** → créer immédiatement une `WorkSession` dans Dexie avec `status: 'in_progress'` et `startedAt: now()`. La durée et les métadonnées sont remplies plus tard.
3. **Au démarrage de l'app** → détecter une session `status: 'in_progress'` et recalculer le temps écoulé depuis `startedAt`. Reprendre le chronomètre automatiquement.
4. **Au clic Stop** → mettre à jour la session existante (`status: 'completed'`, `duration` calculée) puis ouvrir le formulaire pour les métadonnées (titre, projet, productivité…).
5. **Pause** → stocker le timestamp de début de pause dans Dexie pour un calcul correct du temps écoulé.

### Fichiers modifiés
- `src/features/sessions/work/work-timer.tsx` — persistance `localStorage`, calcul elapsed avec pauses
- `src/features/sessions/work/work-session-page.tsx` — détection timer actif au montage (`useEffect` + `loadTimerState`)

**Statut** : ✅ Corrigé — 2026-02-27
