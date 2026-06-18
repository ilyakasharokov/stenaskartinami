'use strict';

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
  }
};

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

    const dirs  = [...new Set((allArts as any[]).flatMap(a => (a.styles   || []).map((s: any) => s.Title || s.title).filter(Boolean)))].sort();
    const techs = [...new Set((allArts as any[]).flatMap(a => (a.mediums  || []).map((m: any) => m.title || m.Title).filter(Boolean)))].sort();
    const subjs = [...new Set((allArts as any[]).flatMap(a => (a.subjects || []).map((s: any) => s.Title || s.title).filter(Boolean)))].sort();

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

    if (data.Title) {
      data.slug = slugifyValue(data.Title);
    }

    updateDimensions(data);
  },

  async beforeUpdate(event: any) {
    const { data } = event.params;

    if (data.Title) {
      data.slug = slugifyValue(data.Title);
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
    if (event.result?.id) await syncArtistTags(event.result.id);
  },

  async afterUpdate(event: any) {
    if (event.result?.id) await syncArtistTags(event.result.id);
  },
};
