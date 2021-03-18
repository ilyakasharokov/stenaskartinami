module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'mailgun',
    providerOptions: {
      apiKey: env('MAILGUN_API_KEY'),
      domain: env('MAILGUN_YOUR_DOMAIN')
    },
    settings: {
      defaultFrom: 'no-reply@stenaskartinami.com',
      defaultReplyTo: 'admin@stenaskartinami.com',
    },
  },
  // ...
});