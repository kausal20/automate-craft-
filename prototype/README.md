# AutomateCraft UI prototype

A standalone copy of the AutomateCraft frontend that runs on mock data. Use it to redesign
anything — layout, navigation, colors, components — without touching the real product.

- **No backend.** There are no API routes, no database, no Supabase, no AI calls, no
  environment variables. Every `/api/...` request is answered in the browser by
  `src/mock/api.ts`.
- **No production traffic.** Requests to any other website are blocked twice: by the mock
  layer and by a browser security header (`connect-src 'self'` in `next.config.ts`).
- **Same structure as production.** Pages live at the same paths as in the real app
  (`src/app/...`), so a finished design can be moved back file for file.

## 1. Install

You need Node.js 20 or newer (`node -v` to check).

```bash
cd prototype
npm install
```

## 2. Run

```bash
npm run dev
```

Open http://localhost:4000. Port 4000 keeps it apart from the real app on 3000.

Click the **Prototype** button in the bottom-right corner for a list of every page, a
sign-in/sign-out switch, and **Reset mock data**. The full list is also at
http://localhost:4000/prototype.

## 3. Where things are

| What | Where |
| --- | --- |
| Pages | `src/app/<route>/page.tsx` — e.g. `src/app/dashboard/logs/page.tsx` is `/dashboard/logs` |
| Dashboard shell (sidebar, mobile menu, credits button) | `src/components/dashboard/DashboardShell.tsx` |
| Shared components | `src/components/` (by area: `dashboard/`, `chat/`, `auth/`, `home/`, `nav/`) |
| Marketing header and footer | `src/components/NavbarClient.tsx`, `src/components/Footer.tsx` |
| Which pages show header/footer | `src/components/AppChrome.tsx` |
| Colors, fonts, type scale, motion | `src/app/globals.css` — the `@theme inline { ... }` block at the top |
| Font loading | `src/app/layout.tsx` |
| Mock data | `src/mock/data/` — `automations.ts`, `runs.ts`, `integrations.ts`, `credits.ts`, `chats.ts`, `user.ts` |
| Fake API (one function per endpoint) | `src/mock/api.ts` |
| Scripted AI chat replies | `src/mock/chat-stream.ts` |
| Prototype panel and page list | `src/prototype/` |

### Colors and fonts

Tokens live in `src/app/globals.css`, for example:

```css
--color-background: #09090b;
--color-accent: #3b82f6;
--font-sans: var(--font-inter), system-ui, sans-serif;
```

Classes like `bg-background`, `text-accent` and `font-heading` read these tokens, so changing
one value updates every place that uses the class. Many production components also hard-code
colors (`bg-[#0a0a0a]`, `text-[#3b82f6]`, about 280 places). Those do not follow the tokens;
search for the hex value to change them, or replace them with token classes as you redesign.

### Mock data

Edit the files in `src/mock/data/` and click **Reset mock data** (changes are saved in your
browser, so the reset is needed to load new seed data). Things you do in the app — running,
pausing or deleting an automation, connecting an app, buying credits — are saved in the
browser too and survive a refresh.

The chat is scripted, not AI:

- a first message under 20 characters gets a clarifying question
- a message containing the word "fail" stops with a validation error
- anything else builds a workflow from your words and shows it on the canvas

Sign-up accepts any details, shows the "Verify your email" screen, and continues to the
dashboard after 6 seconds as if the emailed link was clicked. Log in accepts anything.

Some production pages contain their own invented numbers inside the page file (Usage
Intelligence, parts of All Automations and Execution Logs). Those come from the real app
unchanged and are not driven by `src/mock/`.

## 4. Build and preview

```bash
npm run build
npm run start
```

`npm run typecheck` and `npm run lint` check the code. Lint reports 9 errors that already
exist in the production files this was copied from; they do not stop the build.

To share a live link, deploy only this folder: on Vercel create a project from this repo,
pick the `ui-redesign-prototype` branch, and set **Root Directory** to `prototype`. It needs
no environment variables.

## 5. Working on the prototype branch only

All work goes on the `ui-redesign-prototype` branch. Never merge it into `main`.

```bash
git fetch origin
git switch ui-redesign-prototype
git pull
# ...work inside prototype/ ...
git add prototype
git commit -m "Redesign logs page"
git push origin ui-redesign-prototype
```

Only change files inside `prototype/`. Files outside it belong to the real app.

## Differences from production

- `src/lib/auth.ts`, `env.ts` and `supabase-browser.ts` are small mocks with the same function
  names. "Signed in" is one cookie; dashboard pages open even when signed out.
- `src/lib/agent/index.ts` holds only the chat UI's types; the AI pipeline is not included.
- Supabase realtime credit updates and the runtime debug probe were removed.
- Added: a phone menu in the dashboard (production has no phone navigation), the Prototype
  panel, and the `/prototype` page.
