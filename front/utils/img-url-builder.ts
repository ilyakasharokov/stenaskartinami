// Use public API base so the browser can load images (not internal hostnames like api-v5:1337)
const PUBLIC_API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');

export default function imageUrlBuilder(url) {
  if (!url) return url;
  if (url[0] === '/') {
    return PUBLIC_API_BASE + url;
  }
  // Strapi may return full URLs with internal host (e.g. http://api-v5:1337/uploads/...)
  if (url.startsWith('http') && PUBLIC_API_BASE) {
    try {
      const u = new URL(url);
      return PUBLIC_API_BASE + u.pathname;
    } catch {
      return url;
    }
  }
  return url;
}