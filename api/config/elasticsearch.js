
module.exports = ({ env }) => ({
  connection: {
    // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/auth-reference.html
    node: env('ELASTICSEARCH_HOST', 'http://127.0.0.1:9200'),
  },
  setting: {
    importLimit: 3000,
    index_postfix: '',
    index_postfix: '',
    removeExistIndexForMigration: false,
  },
  models: [
  {
    "model": ".gitkeep",
    "index": ".gitkeep",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "art",
    "index": "art",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "artist",
    "index": "artist",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "city",
    "index": "city",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "form",
    "index": "form",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "marquee",
    "index": "marquee",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "medium",
    "index": "medium",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "slide",
    "index": "slide",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "style",
    "index": "style",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "subject",
    "index": "subject",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  },
  {
    "model": "wall",
    "index": "wall",
    "plugin": null,
    "enabled": false,
    "migration": false,
    "pk": "id",
    "relations": [],
    "conditions": {},
    "fillByResponse": true,
    "supportAdminPanel": true,
    "urls": []
  }
]
});
