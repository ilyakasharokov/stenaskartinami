'use strict';

const slugOptions = { lower: true, remove: /[*+~.()'"!:@ь«»\/#,]/g };

const slugifyValue = (value: unknown) => {
  if (!value) return value as string;
  const lower = slugOptions.lower ? value.toString().toLowerCase() : value.toString();
  return lower
    .replace(slugOptions.remove, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;

    if (data.Title) {
      data.slug = slugifyValue(data.Title);
    }
  },

  async beforeUpdate(event: any) {
    const { data } = event.params;

    if (data.Title) {
      data.slug = slugifyValue(data.Title);
    }
  },
};
