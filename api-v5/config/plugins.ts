export default ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.yandex.ru'),
        port: env.int('SMTP_PORT', 465),
        secure: env.bool('SMTP_SECURE', true),
        auth: {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASS'),
        },
      },
      settings: {
        defaultFrom: env('SMTP_FROM', env('SMTP_USER')),
        defaultReplyTo: env('SMTP_USER'),
      },
    },
  },

  upload: env("AWS_REGION")
    ? {
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
      }
    : {},

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
      artist: {
        indexName: "artist",
        populate: ["avatar"],
        transformEntry({ entry }) {
          const av = entry.avatar;
          return {
            id: entry.id,
            full_name: entry.full_name || "",
            nickname: entry.nickname || "",
            slug: entry.slug || "",
            avatar: av?.formats?.thumbnail?.url || av?.formats?.small?.url || av?.url || null,
          };
        },
        settings: {
          searchableAttributes: ["full_name", "nickname"],
          displayedAttributes: ["id", "full_name", "nickname", "slug", "avatar"],
        },
      },
      wall: {
        indexName: "wall",
        transformEntry({ entry }) {
          return {
            id: entry.id,
            Title: entry.Title || "",
            slug: entry.slug || "",
            Address: entry.Address || "",
          };
        },
        settings: {
          searchableAttributes: ["Title", "Address"],
          displayedAttributes: ["id", "Title", "slug", "Address"],
        },
      },
    },
  },
});
