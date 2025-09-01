import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SequenceBuilderFlow from '@/components/sequences/SequenceBuilderFlow'

export default async function NewSequencePage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  return <SequenceBuilderFlow userId={session.user.id} />
}