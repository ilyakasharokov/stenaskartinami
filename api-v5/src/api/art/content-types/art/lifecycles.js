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

const updateDimensions = (data) => {
  if (typeof data.width !== 'undefined' && typeof data.height !== 'undefined') {
    data.square = data.width * data.height;
    data.isSquare = data.width === data.height;
  }
};

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    if (data.Title) {
      data.slug = slugifyValue(data.Title);
    }

    updateDimensions(data);
  },

  async beforeUpdate(event) {
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
