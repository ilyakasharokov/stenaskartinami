module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'mailgun',
    providerOptions: {
      apiKey: env('MAILGUN_API_KEY'),
      domain: env('MAILGUN_YOUR_DOMAIN'),
      host: env('MAILGUN_HOST', 'api.eu.mailgun.net'), //Optional. If domain region is Europe use 'api.eu.mailgun.net'
    },
    settings: {
      defaultFrom: 'no-reply@stenaskartinami.com',
      defaultReplyTo: 'admin@stenaskartinami.com',
    },
  },
  // ...
});