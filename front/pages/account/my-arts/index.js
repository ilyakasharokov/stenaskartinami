import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function MyArts() {
  const router = useRouter()
  useEffect(() => { router.replace('/account/profile') }, [])
  return null
}
