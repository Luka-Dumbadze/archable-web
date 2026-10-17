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
- Backend is the user's own external Supabase via `src/lib/supabase.ts` (publishable key only); why: Lovable Cloud must not be enabled and service-role keys are banned.
- Chat API lifecycle belongs in a browser-effect hook; tenant hosts use the externally maintained session/contracts modules without editing them, while other hosts retain demo chat, to avoid SSR session work.
- Owner sign-in at `/signin` delegates to the externally maintained web-link helper from a mount-only browser effect, with one shared attempt across effect replay; why: one-time links must not be exchanged during SSR or twice on mount.
- Owner customer testing uses the externally maintained useTryTurn hook without editing either owner helper; why: UI changes must preserve the external request and conversation lifecycle contract.
- Customer-test detail paths use a non-nested /dev/turns/$id route with an unavailable state until a detail-read contract exists; why: supplied links must resolve without inventing a data endpoint.
- AppShell wraps the outlet inside QueryClientProvider and boots the unchanged shell hook once; ready branding updates the primary CSS token with cleanup, while Workspace and OwnerMode read the shared snapshot so staged updates apply only on navigation.
