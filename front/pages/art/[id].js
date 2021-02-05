import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from "next/router";


export default function Art() {
  const router = useRouter();
  return (
    <>
      <Head>
        <title>First </title>
      </Head>
      <h1>First Art</h1>
      <h2>
        <Link href="/">
        <p>Post id: {router.query.id}</p>
        </Link>
      </h2>
    </>
  )
}
