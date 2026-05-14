# Twitter Card Preview

Preview how a page looks when shared on Twitter/X using its meta tags.

## API

```
GET /api/preview?url=https://example.com
```

Returns JSON with the Twitter card type, title, description, image, site handle, creator handle, and domain.

## Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lindoai/twitter-card-preview)

## Environment

- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
