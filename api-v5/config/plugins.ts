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
          ACL: "private",
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },

  meilisearch: {
    config: {
      host: env("MEILISEARCH_HOST", "http://localhost:7700"),
      apiKey: env("MEILISEARCH_API_KEY", ""),
      art: {
        indexName: "art",
        populate: ["Artist", "Pictures"],
        transformEntry({ entry }) {
          const pic = entry.Pictures?.[0];
          return {
            id: entry.id,
            Title: entry.Title || "",
            slug: entry.slug || "",
            img: pic?.url || null,
            Artist_full_name: entry.Artist?.full_name || "",
          };
        },
        settings: {
          searchableAttributes: ["Title", "Artist_full_name"],
          displayedAttributes: ["id", "Title", "slug", "img", "Artist_full_name"],
        },
      },
    },
  },
});
