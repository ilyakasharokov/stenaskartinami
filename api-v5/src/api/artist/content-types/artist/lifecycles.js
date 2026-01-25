'use strict';

const slugOptions = { lower: true, remove: /[*+~.()'"!:@ь«»\/#,]/g };

const slugifyValue = (value) => {
  if (!value) return value;
  const lower = slugOptions.lower ? value.toString().toLowerCase() : value.toString();
  return lower
    .replace(slugOptions.remove, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    if (data.full_name) {
      data.slug = slugifyValue(data.full_name);
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;

    if (data.full_name) {
      data.slug = slugifyValue(data.full_name);
    }
  },
};
