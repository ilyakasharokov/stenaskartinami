import Document, { Html, Head, Main, NextScript } from 'next/document'

export default class MyDocuement extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link rel="shortcut icon" type="image/png" href="/favicon.png" />
        </Head>
        <body>
          <Main/>
          <NextScript/>
        </body>
      </Html>
    )
  }
}