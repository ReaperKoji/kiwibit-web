# Kiwibit (Next.js)

Projeto migrado de Vite para Next.js (App Router) com Tailwind CSS.

## Estrutura

- `app/`: rotas do Next
- `app/page.tsx`: tela de autenticação
- `app/member/page.tsx`: Member Panel
- `components/auth/`: componentes da autenticação
- `components/member/`: componentes do painel de membro

## Rodando localmente

```bash
npm install
npm run dev
```

Prerequisito: configure `DATABASE_URL` valido antes de iniciar o projeto. O fluxo de membros/admin/login opera em modo DB-first.

Rotas:

- `http://localhost:3000/`
- `http://localhost:3000/member`

## Admin e membros dinâmicos

- `/team`: diretório dinâmico via `GET /api/members`
- `/admin`: CRUD completo de membros, upload de avatar e ações em lote (ativar/desativar)
- `/api/admin/members/metrics?period=7|30`: métricas de funil
- `/api/admin/members/metrics?period=7|30&format=csv`: export CSV
- `/api/admin/blog/growth`: cohort, retenção, CTR por CTA e bandas de performance
- `/api/admin/posts/assist`: AI Editor (score SEO, título/resumo sugeridos, links internos)
- `/api/blog/search/semantic?q=...`: busca semântica + resposta RAG contextual
- `/api/activity/feed`: feed de atividade (posts + GitHub events)
- `/api/member/reputation/:memberId`: score de reputação técnica

## Variáveis de ambiente importantes

- `NEWSLETTER_FROM_EMAIL`
- `RESEND_API_KEY`
- `MAILCHIMP_API_KEY`
- `MAILCHIMP_AUDIENCE_ID`
- `MAILCHIMP_SERVER_PREFIX`
- `OPS_ALERT_WEBHOOK_URL` ou `SLACK_WEBHOOK_URL` (alertas operacionais)
- `AV_SCAN_WEBHOOK_URL` (scan de upload)
- `DB_STRICT=true` (recomendado em producao)
- `UPLOAD_SIGNATURE_SECRET` (assinatura de upload segura)
- `BLOG_REQUIRE_DOUBLE_APPROVAL=true` (aprovação dupla para publish)
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (observabilidade)

## SEO, i18n e performance

- Rotas em inglês para blog: `/en/blog` e `/en/blog/[slug]` com `hreflang`
- OG social snippets dinâmicos por post em `/api/og/post/[slug]`
- Páginas pillar/topic cluster em `/blog/pillars/[topic]`
- CI com perf budget Lighthouse (`.lighthouserc.json`)
