module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'mailgun',
    providerOptions: {
      apiKey: env('MAILGUN_API_KEY')
    },
    settings: {
      defaultFrom: 'no-reply@stenaskartinami.com',
      defaultReplyTo: 'admin@stenaskartinami.com',
    },
  },
  // ...
});