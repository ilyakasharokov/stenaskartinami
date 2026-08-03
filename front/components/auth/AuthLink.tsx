import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useAuthModal } from '@/components/auth/AuthModal'

// A Link that opens the auth modal (instead of navigating) when the visitor is
// not signed in. After login the modal sends them to `href`.
export default function AuthLink({ href, children, onClick, ...rest }) {
  const { data: session } = useSession()
  const { open } = useAuthModal()
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        if (onClick) onClick(e)
        if (!session) {
          e.preventDefault()
          open(typeof href === 'string' ? href : undefined)
        }
      }}
    >
      {children}
    </Link>
  )
}
