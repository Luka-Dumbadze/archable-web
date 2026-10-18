<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Selected business lives in the URL as `?biz=<id>` on `/`, `/dev`, `/chat`; why: reloads and links keep state without storage.
- Workspace app selection lives in the validated `view` search parameter on `/`; the desktop is the sole owner workspace with dedicated BusinessAppViews for inbox/CRM/operations; legacy owner links normalize to the desktop and team links redirect to `/dev`, so existing business interactions and maintained hooks remain intact.
- Supplemental workspace files and metrics are labeled samples; AI Team subscribes in a browser effect to the unchanged shell tool-call broadcasts for real activity and uses labeled examples only outside ready tenants. The single dock customer action opens the unchanged testing console in a shared dialog, and workspace theme overrides are scoped so maintained modules stay unchanged.
- Backend is the user's own external Supabase via `src/lib/supabase.ts` (publishable key only); why: Lovable Cloud must not be enabled and service-role keys are banned.
- Chat API lifecycle belongs in a browser-effect hook; tenant hosts use the externally maintained session/contracts modules without editing them, while other hosts retain demo chat, to avoid SSR session work.
- Owner sign-in at `/signin` delegates to the externally maintained web-link helper from a mount-only browser effect, with one shared attempt across effect replay; why: one-time links must not be exchanged during SSR or twice on mount.
- Owner customer testing uses the externally maintained useTryTurn hook without editing either owner helper; why: UI changes must preserve the external request and conversation lifecycle contract.
- Customer-test detail paths use a non-nested /dev/turns/$id route with an unavailable state until a detail-read contract exists; why: supplied links must resolve without inventing a data endpoint.
- AppShell wraps the outlet inside QueryClientProvider and boots the unchanged shell hook once; ready branding updates the primary CSS token with cleanup, while Workspace reads the shared snapshot so staged updates apply only on navigation.
- Developer Console separates live tool-call activity, graph and desires into top tabs, and uses a dismissible right-side inspector; presentation lives in components/archable and consumes unchanged src/dev hooks; the map is dynamically loaded behind ClientOnly to keep graph libraries out of SSR, and supplied ELK positions are never recomputed by presentation code.
- Shared rationale presentation consumes maintained helpers and fixtures; owner and developer entry points share it so sentences stay identical while sources remain developer-only.
- Owner Architect chat presentation lives in src/owner/OwnerChat.tsx, delegates conversation and button handling to the unchanged useOwnerChat hook, and reuses the unchanged shared owner rationale card; mount it in a Workspace sheet keyed by business ID so switching businesses cannot retain another conversation.
- Developer structured desires use the unchanged useDesires hook in DevMode and a presentation-only StructuredDesiresFeed; impact, price, unlink/reset and rationale stay delegated to maintained helpers so refreshed data remains authoritative.
