import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from "next/router";


export default function Art() {
  const router = useRouter();
  return (<MainLayout>
    <h1>Art</h1>
    { router.query.id }
  </MainLayout>
  )
}
