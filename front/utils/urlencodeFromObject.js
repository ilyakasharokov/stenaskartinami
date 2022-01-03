function urlencodeFromObject(obj){
    let urlEncodedData = "",
    urlEncodedDataPairs = [],
    name;

    for( name in obj ) {
    if(obj[name] && obj[name].forEach){
        obj[name].forEach((d)=>{
        urlEncodedDataPairs.push( encodeURIComponent( name ) + '=' + encodeURIComponent( d ) );
        })
    }else{
        urlEncodedDataPairs.push( encodeURIComponent( name ) + '=' + encodeURIComponent( obj[name] ) );
    }
    }
    return urlEncodedData = urlEncodedDataPairs.join( '&' ).replace( /%20/g, '+' );
}

export default urlencodeFromObject;