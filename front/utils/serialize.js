const size = {
  small: [0, 20],
  medium: [20, 40],
  large: [40,60], 
  huge: [60, 1000]
}

function serialize(obj){
  let str = '?';
  let i1 = 0;
  if(!obj._sort){
    obj._sort = 'published_at:desc';
  }
  for (const [key, value] of Object.entries(obj)) {
      let i2 = 0;
      
      //str += `_where[${i1}][_or][${i2}]`  

      if (obj[key].forEach) {
        obj[key].forEach && obj[key].forEach((val) => {
          switch ( key ){
            case 'size':
              str += `_where[${i1}][_or][${i2}][square_gte]=${size[val][0]**2}&`;
              str += `_where[${i1}][_or][${i2}][square_lte]=${size[val][1]**2}&`;
              i2 += 2;
              break;
            case '_sort':
            case '_start':
            case '_limit':
              str += `&${key}=${value}&`
              break;
            default:
              str += `_where[${i1}][_or][${i2}][${key}.slug]=${val}&`
              i2++;
            }
        })
      }else{
        switch(key){
          case 'size':
            str += `&square_gte=${(size[value][0]**2)}&square_lte=${(size[value][1]**2)}&`
            i2 += 1;
            break;
          case '_sort':
          case '_start':
          case '_limit':
            str += `&${key}=${value}&`
            break;
          default:
            str += `_where[${i1}][_or][${i2}][${key}.slug]=${value}&`
            break;
        }
      }
      i1++;
  }
  return str
}

export default serialize