import Document, { Html, Head, Main, NextScript } from 'next/document'

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang={this.props.lang || "en"}>
        <Head>
          <script
            dangerouslySetInnerHTML={{
              __html: `<!-- Yandex.Metrika counter -->
              <script type="text/javascript" >
                 (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                 m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                 (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
              
                 ym(74736403, "init", {
                      clickmap:true,
                      trackLinks:true,
                      accurateTrackBounce:true,
                      webvisor:true
                 });
              </script>
              <noscript><div><img src="https://mc.yandex.ru/watch/74736403" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
              <!-- /Yandex.Metrika counter -->`
            }}
          />
          <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}