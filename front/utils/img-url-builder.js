import { API_HOST } from '@/constants/constants'

export default function imageUrlBuilder(url){
    if( url && url[0] == '/')
      return API_HOST + url;
    return url
  }