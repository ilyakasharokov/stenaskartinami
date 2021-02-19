module.exports = ({ env }) => ({
  upload: {
    provider: 'aws-s3',
    providerOptions: {
<<<<<<< HEAD
      accessKeyId: 'AKIAJZYODCTSOW4WXANQ',
      secretAccessKey: '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',
      region: 'eu-central-1',
      params: {
        Bucket: 'stenastrapi',
=======
      accessKeyId: env('AWS_ACCESS_KEY_ID'),
      secretAccessKey: env('AWS_ACCESS_SECRET'),
      region: env('AWS_REGION'),
      params: {
        Bucket: env('AWS_BUCKET_NAME'),
>>>>>>> f16902c45a7fca41a4f867bab6e18cca30e8af69
      },
    },
  },
});
