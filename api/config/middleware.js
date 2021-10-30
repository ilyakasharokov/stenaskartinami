module.exports = ({ env }) => ({
    settings: {
      cache: {
        enabled: true,
        type: 'redis',
        models: ['arts', 'artists', 'mediums', 'slides', 'styles', 'subjects', 'walls'],
        maxAge: 1800000,
      }
    }
  });
