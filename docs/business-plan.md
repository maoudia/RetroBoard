# RetroBoard - Business plan and risks

Split out of the former master plan on 2026-11-05. The 2026-11-04 diagnosis (Docs artifact) refines it for the open-source model: code stays AGPL-3.0, revenue comes from convenience, capacity, brand and expertise. Billing itself is specified in the change `licensing-and-monetization`. Section numbers are kept (13 to 16).

## 13. Business plan (en francais)

### 13.1 Positionnement

Retro gratuite, belle et sans compte, chiffree de bout en bout, qui ne garde rien. Cible : equipes agiles de 3 a 50 personnes, Scrum Masters freelances, ESN et equipes produit sensibles a la confidentialite (banque, sante, secteur public).

### 13.2 Offre (principe : le gratuit suffit pour faire une vraie retro)

| Offre | Prix indicatif | Contenu |
|---|---|---|
| **Free** | 0 EUR | Toutes les fonctions de base : agenda, votes, groupes, actions, export fichiers, 2 themes pro + 2 themes fun, jusqu'a 15 participants, retro jusqu'a 2 h |
| **Pro (facilitateur)** | 24 EUR/an (ou 2,99 EUR/mois) | Jusqu'a 50 participants, tous les themes et formats avances, agenda personnalisable illimite, rapport avance et marque, compagnon IA (presets), relais TURN pour les reseaux d'entreprise, sessions jusqu'a 4 h |
| **Team** | 79 EUR/an | 5 facilitateurs, 100 participants, packs exclusifs, branding (logo, couleurs) sur board et rapport |
| **Packs** | 3 a 5 EUR, achat unique | Themes saisonniers premium, formats de retro thematiques |
| **Self-host** | Gratuit (AGPL-3.0) | Libre, y compris en service, a condition de publier ses modifications ; licence commerciale (sans obligations AGPL), support et installation privee sur devis MAIDAF |

Pourquoi l'annuel en priorite : sur 2,99 EUR, les frais Polar (5 % + 0,50 USD, +1,5 % carte hors US sur le plan Starter) prennent environ 20 % ; sur 24 EUR, environ 9 %. Source : <https://polar.sh/docs/fees>.

### 13.3 Abonnements sans serveur ni base

1. Achat sur Polar (Merchant of Record) : Polar encaisse, gere la facturation client, les remboursements et le portail client.
2. Polar envoie une **cle de licence** liee a l'abonnement (revoquee automatiquement a la fin de l'abonnement). Source : <https://polar.sh/docs/features/benefits/license-keys>.
3. Le facilitateur colle la cle dans RetroBoard. Le Worker appelle l'API de validation Polar et renvoie un **jeton d'entitlement signe** (Ed25519, valable 7 jours, plan + limites). Rien n'est stocke chez nous ; la cle privee de signature est un secret du Worker (configuration, pas une donnee client).
4. Le jeton est garde dans le navigateur du facilitateur et presente a la creation d'une room. Le Durable Object verifie la signature et applique les quotas (participants, duree, TURN). Les participants profitent du plan du facilitateur.
5. Les fonctions purement client (themes premium, formats) sont livrees par le Worker seulement sur jeton valide. Le code est source-available : quelqu'un de determine peut les reconstruire pour son usage interne, ce que la licence autorise. La valeur vendue est le service heberge, la commodite et le soutien.

### 13.4 Cadre juridique et fiscal (a valider avec ton expert-comptable)

- **Licence** : GNU AGPL-3.0-only (licence open source approuvee OSI). Quiconque fait tourner une version modifiee en service doit en publier le code source (art. 13 AGPL). Double licence : une licence commerciale peut etre vendue par MAIDAF a ceux qui ne veulent pas de ces obligations ; cela suppose de detenir les droits sur tout le code, donc un CLA (Contributor License Agreement) pour les contributions externes (CLA Assistant, gratuit). Les commits jusqu'au tag `last-mit` restent sous MIT.
- **TVA** : en passant par un Merchant of Record, c'est lui qui vend au client final et gere la TVA de chaque pays (Directive 2006/112/CE, art. 58 pour le lieu de taxation des services electroniques B2C). Toi, tu factures une prestation au MoR. La qualification exacte (autoliquidation, lieu de la prestation B2B, CGI art. 259-1) est **a verifier** avec ton expert-comptable.
- **Mentions legales** obligatoires sur le site : loi n. 2004-575 du 21 juin 2004 (LCEN), art. 6-III.
- **RGPD** : meme sans stockage, Cloudflare traite des adresses IP et Polar des donnees de facturation. Il faut une politique de confidentialite (RGPD art. 13) qui liste ces traitements et sous-traitants.
- **CGV / CGU** : generees par le MoR pour la vente ; CGU du service a rediger (limites, absence de garantie de conservation des boards, puisque rien n'est stocke).

### 13.5 Projections prudentes (hypotheses, pas des promesses)

| Hypothese | Valeur |
|---|---|
| Equipes actives par mois apres 12 mois | 1 000 |
| Conversion Pro/Team | 2 a 3 % |
| Panier moyen annuel | 30 EUR |
| Revenu annuel brut | 600 a 900 EUR, avant frais (environ 10 %) |

Conclusion honnete : c'est un produit vitrine et un levier de missions (facilitation, self-host entreprise) plus qu'une source de revenus principale la premiere annee. Le cout d'infrastructure restant a 0 EUR, chaque vente est de la marge.

### 13.6 Acquisition sans tracking

Landing SEO (pages "format de retro X"), modeles de retro partageables, badge "Made with RetroBoard" sur les rapports exportes, GitHub (stars, contributions), posts LinkedIn de cas concrets, partenariats avec des coachs agiles.

## 14. Extra ideas

- **Presenter mode** for TV/projector with QR code to join and huge type.
- **ROTI** (return on time invested) vote at the end, trend kept in the local team profile.
- **Team health radar** (optional check-in format), trends over retros, local only.
- **Icebreaker deck** for the check-in phase, themed with the board theme.
- **Keyboard-first facilitation**: command palette (`Cmd+K`) for phases, timer, reveal.
- **Offline-first PWA**: write drafts on a plane, publish when back.
- **Anonymity guard**: hide authors until the end of the Write phase, then reveal if wanted.
- **Duplicate detection** while writing ("3 similar ideas already published").
- **Reactions** (emoji) on ideas, cheap P2P, no vote weight.
- **Retro of retros**: local trends of themes and recurring blockers across sprints.
- **Calendar file** (`.ics`) for action due dates.
- **Kudos wall** export as an image for Slack.
- **Facilitator coaching tips** per phase (local, no AI needed).
- **Community format gallery** through pull requests to `packages/domain` templates.

## 15. Risks and open points

| Risk | Mitigation |
|---|---|
| Board lost when every participant leaves | Clear UI promise, board file export, reminder before closing tab, team space keeps actions |
| Browser storage eviction | `navigator.storage.persist()`, board file, short retention by design |
| WebRTC mesh does not scale past about 15 peers | Partial mesh, relay fallback at 4 Hz, cursor display cap |
| Free quota exhausted by abuse | Turnstile, per-IP caps, room lifetime caps, cursors P2P |
| E2E hides abuse content from us | Report flow sends the offending content (decrypted by the reporter) to the facilitator only; we cannot moderate what we cannot read, stated in CGU |
| AGPL does not forbid resale | Network copyleft makes closed resale impractical; trademark "RetroBoard" and the hosted service remain ours; commercial license for those who need closed use |
| Polar dependency | License token format is ours; switching MoR changes only the redemption adapter |
| Local AI quality and hardware | Opt-in, graceful degradation, no feature depends on it |

Points still to verify during implementation (not blocking the plan): free-plan availability of the Workers rate limiting binding; Slack webhook CORS from browsers; Workers preview URLs per PR with current Wrangler; number of free WAF custom rules.

## 16. Traceability: request -> change

| Request (2026-10-24) | Change |
|---|---|
| Responsive i18n issues | `responsive-and-i18n-hardening` |
| Theme respected, not overridable; dark/white variants | `theme-policy-and-variants` |
| Global expandable countdown with cut rings | `timeboxed-agenda` |
| Predefined time-based retro (1 h, previous objectives, write, vote, actions) | `timeboxed-agenda`, `actions-v2-and-carry-over` |
| See each user's cursor | `p2p-presence-and-cursors` |
| Less nerdy export with file icons | `export-hub` |
| Straightforward sharing | `frictionless-sharing` |
| Protect each board (JAMstack) | `e2e-encrypted-rooms` |
| Export actions only | `export-hub` |
| Action owner suggestions + free text | `actions-v2-and-carry-over` |
| Import previous actions, Jira-like or checkbox status | `actions-v2-and-carry-over`, `board-creation-v2` |
| Previous actions popup at start | `actions-v2-and-carry-over`, `timeboxed-agenda` |
| Talk time with popup or ring, in settings | `talk-time` |
| Readable and groupable post-its at scale, real colours, animations | `postit-visual-system` |
| Mobile to TV and projector | `responsive-and-i18n-hardening` |
| No storage on our side, replication to resuscitate | `stateless-relay-and-replication` |
| Time-box agent, finish and report | `local-ai-companion`, `retro-report` |
| Intuitive publishing, rethink publishing UI | `publishing-ux-redesign` |
| MCP for agents, help agents add feedback, time-boxed agent sessions | `retro-mcp-and-agent-sessions` |
| Ethical business plan | Section 13, `licensing-and-monetization` |
| Expand all groups in a column | `clusters-as-merged-ideas` |
| HTML generated video on the home page | `landing-v2-and-product-video` |
| Open source mention on landing | `landing-v2-and-product-video` (AGPL-3.0) |
| Profile uses landing theme; friendly avatar, personas, Gravatar | `theme-policy-and-variants`, `profile-avatars-and-team-space` |
| Smarter retro name (team, sprint, date) | `profile-avatars-and-team-space`, `board-creation-v2` |
| Accurate visible voting, votes on groups, hide counts | `voting-v2-and-ranking`, `clusters-as-merged-ideas` |
| Votes and max people options at creation | `board-creation-v2` |
| Podium after voting | `voting-v2-and-ranking` |
| Group name, merged idea, votable, renamable | `clusters-as-merged-ideas` |
| Export to Atlassian, Google, Slack, structured files, agents | `export-hub` |
| Agentic GitHub Actions workflows, top CI/CD | `agentic-delivery-harness` |
| Cloudflare (Workers), no cost, free plan security | `edge-security-and-domain` |
| Funny companion with local LLMs | `local-ai-companion` |
| Auto-generated report page with metrics | `retro-report` |
| DDD, clean architecture, maintainable by agents | `restructure-ddd-monorepo`, `AGENTS.md`, skill `retroboard-stack` |
| WebMCP support for browser agents | `webmcp-browser-agents` |
| OpenSpec with Claude Code and OpenCode | `openspec/`, `.claude/`, `.opencode/` |
