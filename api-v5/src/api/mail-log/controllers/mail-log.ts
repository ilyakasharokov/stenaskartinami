import { factories } from '@strapi/strapi';
import { randomUUID } from 'crypto';

const uid: any = 'api::mail-log.mail-log';
const artistUid = 'api::artist.artist';
const userUid = 'plugin::users-permissions.user';

const TRACKING_FIELDS = [
  { key: 'description', weight: 3, minLen: 50 },
  { key: 'country',     weight: 1, minLen: 0 },
  { key: 'city_name',   weight: 1, minLen: 0 },
  { key: 'birth_year',  weight: 1, minLen: 0 },
  { key: 'education',   weight: 1, minLen: 0 },
];
const MAX_SCORE = TRACKING_FIELDS.reduce((s, f) => s + f.weight, 0);

function artistScore(artist: any): number {
  let score = 0;
  for (const f of TRACKING_FIELDS) {
    const v = artist[f.key];
    if (v && String(v).trim().length > f.minLen) score += f.weight;
  }
  return Math.round((score / MAX_SCORE) * 100);
}

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
);

async function isModerator(userId: number): Promise<boolean> {
  const u = await strapi.entityService.findOne(userUid, userId, {}) as any;
  return !!u?.is_moderator;
}

function buildEmailHtml(opts: {
  artistName: string;
  body: string;
  profileUrl: string;
  clickUrl: string;
  openPixelUrl: string;
}): string {
  const bodyHtml = opts.body
    .split('\n')
    .map(l => l.trim() ? `<p style="margin:0 0 12px">${l}</p>` : '<br>')
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto;padding:24px">
  <p style="margin:0 0 20px">Добрый день, ${opts.artistName}!</p>
  ${bodyHtml}
  <p style="margin:20px 0">
    <a href="${opts.clickUrl}"
       style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px">
      Заполнить профиль
    </a>
  </p>
  <p style="font-size:12px;color:#aaa;margin:24px 0 0">
    Стена с картинами · <a href="https://stenaskartinami.com" style="color:#aaa">stenaskartinami.com</a>
  </p>
  <img src="${opts.openPixelUrl}" width="1" height="1" style="display:block;width:1px;height:1px" alt="">
</body></html>`;
}

export default factories.createCoreController(uid, () => ({

  // POST /mail/send-campaign
  async sendCampaign(ctx: any) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!await isModerator(ctx.state.user.id)) return ctx.forbidden();

    const { artistIds, subject, body, campaignId } = ctx.request.body || {};
    if (!artistIds?.length || !subject || !body) {
      return ctx.badRequest('artistIds, subject and body required');
    }

    const PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
                       'https://stenaskartinami.com';
    const API_URL = process.env.STRAPI_SERVER_URL || 'http://localhost:1337/api';

    const campaign = campaignId || randomUUID();
    const results: any[] = [];

    for (const artistId of artistIds) {
      try {
        const artists = await strapi.entityService.findMany(artistUid, {
          filters: { id: { $eq: artistId } } as any,
          status: 'published',
          pagination: { pageSize: 1 },
        });
        const artist = Array.isArray(artists) ? artists[0] : null;
        if (!artist || !artist.email) continue;

        const token = randomUUID();
        const score = artistScore(artist);
        const profileUrl = `${PUBLIC_URL}/artists/${artist.slug}--${artist.id}`;
        const clickUrl = `${PUBLIC_URL}/api/track/click?t=${token}`;
        const openPixelUrl = `${PUBLIC_URL}/api/track/open?t=${token}`;

        const html = buildEmailHtml({
          artistName: artist.full_name || 'художник',
          body,
          profileUrl,
          clickUrl,
          openPixelUrl,
        });

        await strapi.plugin('email').service('email').send({
          to: artist.email,
          from: 'no-reply@stenaskartinami.com',
          subject,
          html,
          text: body,
        });

        await strapi.entityService.create(uid, {
          data: {
            artist: artist.id,
            token,
            subject,
            recipient_email: artist.email,
            sent_at: new Date().toISOString(),
            score_before: score,
            campaign_id: campaign,
          } as any,
        });

        results.push({ artistId, name: artist.full_name, ok: true });
      } catch (e: any) {
        results.push({ artistId, ok: false, error: e.message });
      }
    }

    ctx.body = { campaign, results };
  },

  // GET /mail/logs?campaign=...
  async logs(ctx: any) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!await isModerator(ctx.state.user.id)) return ctx.forbidden();

    const { campaign, page = 1 } = ctx.query;
    const filters: any = {};
    if (campaign) filters.campaign_id = { $eq: campaign };

    const { results, pagination } = await strapi.service(uid).find({
      filters,
      populate: { artist: { fields: ['id', 'full_name', 'slug', 'documentId'] } },
      sort: 'sent_at:desc',
      pagination: { page: Number(page), pageSize: 50 },
    });

    ctx.body = { data: results, meta: { pagination } };
  },

  // GET /track/open?t=TOKEN  — tracking pixel
  async trackOpen(ctx: any) {
    const { t } = ctx.query;
    if (t) {
      try {
        const logs = await strapi.entityService.findMany(uid, {
          filters: { token: { $eq: t } } as any,
          pagination: { pageSize: 1 },
        });
        const log = Array.isArray(logs) ? logs[0] : null;
        if (log && !log.opened_at) {
          await strapi.entityService.update(uid, log.id, {
            data: { opened_at: new Date().toISOString() } as any,
          });
        }
      } catch {}
    }
    ctx.set('Content-Type', 'image/gif');
    ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    ctx.body = PIXEL;
  },

  // GET /track/click?t=TOKEN — click redirect
  async trackClick(ctx: any) {
    const { t } = ctx.query;
    let redirectUrl = 'https://stenaskartinami.com/account/profile?tab=settings';

    if (t) {
      try {
        const logs = await strapi.entityService.findMany(uid, {
          filters: { token: { $eq: t } } as any,
          populate: { artist: { fields: ['id', 'slug'] } },
          pagination: { pageSize: 1 },
        });
        const log = Array.isArray(logs) ? logs[0] : null;
        if (log) {
          if (!log.clicked_at) {
            await strapi.entityService.update(uid, log.id, {
              data: { clicked_at: new Date().toISOString() } as any,
            });
          }
          if (log.artist) {
            redirectUrl = `https://stenaskartinami.com/artists/${log.artist.slug}--${log.artist.id}`;
          }
        }
      } catch {}
    }
    ctx.redirect(redirectUrl);
  },

  // POST /mail/refresh-scores — обновить score_after для всех логов
  async refreshScores(ctx: any) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!await isModerator(ctx.state.user.id)) return ctx.forbidden();

    const { campaign } = ctx.request.body || {};
    const filters: any = { score_after: { $null: true } };
    if (campaign) filters.campaign_id = { $eq: campaign };

    const logs = await strapi.entityService.findMany(uid, {
      filters,
      populate: { artist: true },
      pagination: { pageSize: 200 },
    });

    let updated = 0;
    for (const log of (Array.isArray(logs) ? logs : [])) {
      if (!log.artist) continue;
      const score = artistScore(log.artist);
      if (score !== log.score_before) {
        await strapi.entityService.update(uid, log.id, {
          data: { score_after: score } as any,
        });
        updated++;
      }
    }
    ctx.body = { updated };
  },
}));
