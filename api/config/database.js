module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'postgres');

  if (client === 'mongo') {
    return {
      defaultConnection: 'default',
      connections: {
        default: {
          connector: 'mongoose',
          settings: {
            client: 'mongo',
            host: env('DATABASE_HOST', 'localhost'),
            port: env.int('DATABASE_PORT', 27017),
            database: env('DATABASE_NAME', 'strapi'),
            username: env('DATABASE_USERNAME', null),
            password: env('DATABASE_PASSWORD', null),
          },
          options: {
            authenticationDatabase: env('AUTHENTICATION_DATABASE'),
            ssl: env('DATABASE_SSL'),
          },
        },
      },
    };
  }

  if (client === 'sqlite') {
    return {
      defaultConnection: 'default',
      connections: {
        default: {
          connector: 'bookshelf',
          settings: {
            client: 'sqlite',
            filename: env('DATABASE_FILENAME', '.tmp/data.db'),
          },
          options: {
            useNullAsDefault: true,
          },
        },
      },
    };
  }

  return {
    defaultConnection: 'default',
    connections: {
      default: {
        connector: 'bookshelf',
        settings: {
          client,
          host: env('DATABASE_HOST', '127.0.0.1'),
          port: env.int('DATABASE_PORT', 5432),
          database: env('DATABASE_NAME', 'stenaskartinami'),
          username: env('DATABASE_USERNAME', 'postgres'),
          password: env('DATABASE_PASSWORD', 'postgres'),
          ssl: env.bool('DATABASE_SSL', false),
        },
        options: {
          ssl: env.bool('DATABASE_SSL', false),
        },
      },
    },
  };
};
