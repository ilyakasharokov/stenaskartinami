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
};
