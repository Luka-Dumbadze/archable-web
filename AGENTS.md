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
