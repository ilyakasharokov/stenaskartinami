// Server-side (getServerSideProps) can use STRAPI_SERVER_URL when in Docker (e.g. http://api-v5:1337/api)
const API_HOST = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'https://api.stenaskartinami.com/api')
  : (process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.stenaskartinami.com/api');
const CATALOG_ITEMS_PER_PAGE = 20;
const FREE_ID = "6073682b0b86820e43928225";

export {
    API_HOST,
    CATALOG_ITEMS_PER_PAGE,
    FREE_ID
}
