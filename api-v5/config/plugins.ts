export default ({ env }) => ({
    upload: {
      config: {
        provider: "aws-s3",
        providerOptions: {
          s3Options: {
            region: env("AWS_REGION"),
            credentials: {
              accessKeyId: env("AWS_ACCESS_KEY_ID"),
              secretAccessKey: env("AWS_SECRET_ACCESS_KEY"),
            },
          },
          params: {
            Bucket: env("AWS_S3_BUCKET"),
            ACL: "private", // лучше private + выдавать ссылки через CloudFront/presigned
          },
        },
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      },
    },
  });