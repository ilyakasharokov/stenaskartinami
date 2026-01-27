import { API_HOST } from '@/constants/constants'

export default function imageUrlBuilder(url){
    if (url && url[0] === '/') {
      const base = API_HOST.replace(/\/api\/?$/, '');
      return base + url;
    }
    return url
  }