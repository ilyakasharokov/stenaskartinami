export default {
  routes: [
    {
      method: 'POST',
      path: '/mail/send-campaign',
      handler: 'mail-log.sendCampaign',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/mail/logs',
      handler: 'mail-log.logs',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/mail/refresh-scores',
      handler: 'mail-log.refreshScores',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/track/open',
      handler: 'mail-log.trackOpen',
      config: { policies: [], auth: false },
    },
    {
      method: 'GET',
      path: '/track/click',
      handler: 'mail-log.trackClick',
      config: { policies: [], auth: false },
    },
  ],
};
