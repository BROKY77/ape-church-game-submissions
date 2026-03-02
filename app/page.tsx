import Link from 'next/link'
import Image from 'next/image'
import { getAllGameMetadata } from '@/lib/getGameMetadata'
import StatusBadge from '@/components/shared/StatusBadge'

export default async function Page() {
  const games = await getAllGameMetadata()

  return (
    <main>
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">Ape Church Game Submissions</h1>
      <p className="text-muted-foreground mb-8">Browse submitted games</p>

      {games.length === 0 && (
        <p className="text-muted-foreground">No game submissions yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <Link
            key={game.gameName}
            href={`/submissions/${game.team}/${game.gameName}`}
            className="relative group rounded-xl border border-card-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg"
          >
            <div className="absolute top-2 right-2 z-10">
              <StatusBadge status={game.status} />
            </div>
            {game.thumbnail && (
              <div className="relative aspect-square w-full overflow-hidden">
                <Image
                  src={`/submissions${game.thumbnail}`}
                  alt={game.displayTitle}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <div className="p-4">
              <h2 className="font-semibold text-lg">{game.displayTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {game.team}
                {game.version && (
                  <span className="ml-1.5 text-xs text-muted-foreground/60">v{game.version}</span>
                )}
              </p>
              <p className="text-sm text-card-foreground mt-2 line-clamp-2">{game.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {game.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
