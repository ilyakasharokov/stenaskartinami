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

// Same-origin path for next/image: /uploads/* is proxied to Strapi via a Next
// rewrite (see next.config.js), so the optimizer can fetch it inside Docker.
export function imagePath(url) {
  if (!url) return url;
  if (url[0] === '/') return url;
  if (url.startsWith('http')) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url;
}