import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getGameMetadata } from '@/lib/getGameMetadata'
import StatusBadge from '@/components/shared/StatusBadge'

interface Props {
    params: Promise<{ partner: string; game: string }>
    children: React.ReactNode
}

export default async function GameLayout({ params, children }: Props) {
    const { partner, game } = await params
    const metadata = await getGameMetadata(partner, game)
    const title = metadata?.displayTitle ?? game

    return (
        <div className="w-full max-w-6xl mx-auto">
            <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to all game submissions
            </Link>

            <div className="flex items-center gap-3 mb-1 sm:mb-2">
                <h1 className="text-3xl font-semibold">{title}</h1>
                {metadata?.status && <StatusBadge status={metadata.status} />}
            </div>

            {metadata?.authors && metadata.authors.length > 0 && (
                <p className="text-sm text-muted-foreground mb-4 sm:mb-6">
                    by{' '}
                    {metadata.authors.map((a, i) => (
                        <span key={a.telegram ?? a.name}>
                            {i > 0 && ', '}
                            {a.telegram ? (
                                <a
                                    href={`https://t.me/${a.telegram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    {a.name}
                                </a>
                            ) : (
                                a.name
                            )}
                        </span>
                    ))}
                    {metadata.version && (
                        <span className="ml-2 text-xs text-muted-foreground/60">
                            v{metadata.version}
                        </span>
                    )}
                </p>
            )}

            {children}
        </div>
    )
}
