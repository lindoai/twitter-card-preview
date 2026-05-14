import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { parseHTML } from 'linkedom';
import { readTurnstileTokenFromUrl, verifyTurnstileToken } from '../../_shared/turnstile';
import { renderTextToolPage, turnstileSiteKeyFromEnv } from '../../_shared/tool-page';

type Env = { Bindings: { TURNSTILE_SITE_KEY?: string; TURNSTILE_SECRET_KEY?: string } };

const app = new Hono<Env>();
app.use('/api/*', cors());

app.get('/', (c) =>
  c.html(
    renderTextToolPage({
      title: 'Twitter Card Preview',
      description: 'Preview how a page looks when shared on Twitter/X using its meta tags.',
      endpoint: '/api/preview',
      sample: '{ "url": "https://example.com", "card": "summary_large_image", "title": "Example", "description": "..." }',
      siteKey: turnstileSiteKeyFromEnv(c.env),
      buttonLabel: 'Preview',
      toolSlug: 'twitter-card-preview',
    })
  )
);

app.get('/health', (c) => c.json({ ok: true }));

app.get('/api/preview', async (c) => {
  const captcha = await verifyTurnstileToken(
    c.env,
    readTurnstileTokenFromUrl(c.req.url),
    c.req.header('CF-Connecting-IP')
  );
  if (!captcha.ok) return c.json({ error: captcha.error }, 403);

  const normalized = normalizeUrl(c.req.query('url') ?? '');
  if (!normalized) return c.json({ error: 'A valid http(s) URL is required.' }, 400);

  const html = await fetchHtml(normalized);
  if (!html) return c.json({ error: 'Failed to fetch page.' }, 502);

  const { document } = parseHTML(html);

  const getMeta = (name: string): string =>
    document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() ??
    document.querySelector(`meta[property="${name}"]`)?.getAttribute('content')?.trim() ??
    '';

  const card = getMeta('twitter:card') || 'summary';
  const title =
    getMeta('twitter:title') ||
    getMeta('og:title') ||
    document.querySelector('title')?.textContent?.trim() ||
    '';
  const description =
    getMeta('twitter:description') ||
    getMeta('og:description') ||
    getMeta('description') ||
    '';
  const image =
    getMeta('twitter:image') ||
    getMeta('og:image') ||
    '';
  const site = getMeta('twitter:site') || '';
  const creator = getMeta('twitter:creator') || '';

  const parsedUrl = new URL(normalized);
  const domain = parsedUrl.hostname;

  return c.json({
    url: normalized,
    card,
    title,
    description,
    image,
    site,
    creator,
    domain,
  });
});

async function fetchHtml(url: string) {
  const r = await fetch(url, {
    headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': 'Lindo Free Tools/1.0 (+https://lindo.ai/tools)' },
  }).catch(() => null);
  return r?.ok ? r.text() : null;
}

function normalizeUrl(value: string): string | null {
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).toString();
  } catch {
    return null;
  }
}

export default app;
