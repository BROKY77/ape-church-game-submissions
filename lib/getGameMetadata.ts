import fs from 'fs'
import path from 'path'

export interface GameAuthor {
    name: string
    email: string
}

export interface GameMetadata {
    team: string
    gameName: string
    displayTitle: string
    description: string
    version: string
    authors: GameAuthor[]
    status: string
    category: string
    tags: string[]
    thumbnail: string
    banner: string
    mainComponent: string
    windowComponent: string
    setupComponent: string
    submittedAt: string
    approvedAt?: string
}

export async function getAllGameMetadata(): Promise<GameMetadata[]> {
    const submissionsDir = path.join(process.cwd(), 'submissions')
    const games: GameMetadata[] = []

    if (!fs.existsSync(submissionsDir)) return games

    const partners = fs.readdirSync(submissionsDir)

    for (const partner of partners) {
        const partnerDir = path.join(submissionsDir, partner)
        if (!fs.statSync(partnerDir).isDirectory()) continue

        const gameFolders = fs.readdirSync(partnerDir)

        for (const gameFolder of gameFolders) {
            const metadataPath = path.join(partnerDir, gameFolder, 'metadata.json')
            if (!fs.existsSync(metadataPath)) continue

            const raw = fs.readFileSync(metadataPath, 'utf-8')
            const metadata = JSON.parse(raw) as GameMetadata
            games.push(metadata)
        }
    }

    return games
}

export async function getGameMetadata(team: string, gameName: string): Promise<GameMetadata | null> {
    const metadataPath = path.join(process.cwd(), 'submissions', team, gameName, 'metadata.json')
    if (!fs.existsSync(metadataPath)) return null

    const raw = fs.readFileSync(metadataPath, 'utf-8')
    return JSON.parse(raw) as GameMetadata
}
