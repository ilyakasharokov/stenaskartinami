module.exports = ({ env }) => ({
  upload: {
    provider: 'aws-s3',
    providerOptions: {
      accessKeyId: 'AKIAJZYODCTSOW4WXANQ',
      secretAccessKey: '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',
      region: 'eu-central-1',
      params: {
        Bucket: 'stenastrapi',
      },
    },
  },
});
