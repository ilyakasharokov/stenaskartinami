'use strict';

import { extractAndStoreColors } from '../../../../utils/art-colors';

const CYR_TO_LAT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'j',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

const slugifyValue = (value: unknown) => {
  if (!value) return value as string;
  return value.toString().toLowerCase()
    .split('').map(c => CYR_TO_LAT[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const updateDimensions = (data: any) => {
  if (typeof data.width !== 'undefined' && typeof data.height !== 'undefined') {
    data.square = data.width * data.height;
    data.isSquare = data.width === data.height;
    const w = Number(data.width), h = Number(data.height);
    if (w > 0 && h > 0) {
      data.orientation = h > w * 1.05 ? 'portrait' : w > h * 1.05 ? 'landscape' : 'square';
    }
  }
};

async function notifyArtistFollowers(artId: number) {
  try {
    const art = await strapi.entityService.findOne('api::art.art', artId, {
      populate: { Artist: true, Pictures: true } as any,
      status: 'published',
    } as any);
    if (!art || !(art as any).Artist?.id) return;
    const artist = (art as any).Artist;

    const followers = await (strapi.db as any).connection('artists_followers_lnk')
      .where('artist_id', artist.id)
      .select('user_id')
      .limit(200);
    if (!followers.length) return;

    const imgUrl = (art as any).Pictures?.[0]?.formats?.thumbnail?.url || (art as any).Pictures?.[0]?.url || null;
    const artSlug = `${(art as any).slug || ''}--${art.id}`;
    const artistSlug = `${artist.slug || artist.documentId}--${artist.id}`;

    for (const row of followers) {
      await strapi.db.query('api::notification.notification').create({
        data: {
          type: 'new_art',
          recipient_id: row.user_id,
          actor_name: artist.full_name,
          body: `опубликовал новую работу «${(art as any).title}»`,
          link: `/art/${artSlug}`,
          image_url: imgUrl,
          read: false,
        },
      });
    }
  } catch (e) {
    strapi.log.warn('[notification] notifyArtistFollowers failed:', e);
  }
}

async function syncArtistTags(artId: number) {
  try {
    const art = await strapi.entityService.findOne('api::art.art', artId, {
      populate: { Artist: true, styles: true, mediums: true, subjects: true } as any,
    });
    if (!art || !(art as any).Artist?.id) return;

    const artist = (art as any).Artist;

    // Fetch all published arts by this artist with their tags
    const allArts = await strapi.entityService.findMany('api::art.art', {
      filters: { Artist: { id: { $eq: artist.id } } } as any,
      populate: { styles: true, mediums: true, subjects: true } as any,
      status: 'published',
    } as any);

    const dirs  = [...new Set((allArts as any[]).flatMap(a => (a.styles   || []).map((s: any) => s.title || s.title).filter(Boolean)))].sort();
    const techs = [...new Set((allArts as any[]).flatMap(a => (a.mediums  || []).map((m: any) => m.title || m.title).filter(Boolean)))].sort();
    const subjs = [...new Set((allArts as any[]).flatMap(a => (a.subjects || []).map((s: any) => s.title || s.title).filter(Boolean)))].sort();

    // Update BOTH draft and published rows via raw Knex (document_id matches all versions)
    await (strapi.db as any).connection('artists')
      .where('document_id', artist.documentId)
      .update({
        directions: JSON.stringify(dirs),
        techniques: JSON.stringify(techs),
        subjects: JSON.stringify(subjs),
        works_count: (allArts as any[]).length,
      });
  } catch (e) {
    strapi.log.warn('[art lifecycle] syncArtistTags failed:', e);
  }
}

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;

    if (data.title) {
      data.slug = slugifyValue(data.title);
    }

    updateDimensions(data);
  },

  async beforeUpdate(event: any) {
    const { data } = event.params;

    if (data.title) {
      data.slug = slugifyValue(data.title);
    }

    if (data.Size) {
      if (data.Size.Height) {
        data.height = data.Size.Height;
      }
      if (data.Size.Width) {
        data.width = data.Size.Width;
      }
    }

    updateDimensions(data);
  },

  async afterCreate(event: any) {
    if (!event.result?.id) return;
    await syncArtistTags(event.result.id);
    // Dominant colours (image processing) — non-blocking
    setImmediate(() => extractAndStoreColors(strapi, event.result.id));
    // Notify followers only when the published version is created
    if (event.result.publishedAt) {
      setImmediate(() => notifyArtistFollowers(event.result.id));
    }
  },

  async afterUpdate(event: any) {
    if (!event.result?.id) return;
    await syncArtistTags(event.result.id);
    setImmediate(() => extractAndStoreColors(strapi, event.result.id));
  },
};
