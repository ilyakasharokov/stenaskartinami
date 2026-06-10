export default function AddArtRedirect() { return null }

export async function getServerSideProps() {
  return { redirect: { destination: '/account/add-art', permanent: true } }
}
