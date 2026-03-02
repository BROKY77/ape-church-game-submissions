import { gameRegistry } from '@/lib/gameRegistry'
import { notFound } from 'next/navigation'

interface Props {
    params: Promise<{ partner: string; game: string }>
}

export default async function Page({ params }: Props) {
    const { game } = await params
    const Game = gameRegistry[game]

    if (!Game) return notFound()

    return <Game />
}