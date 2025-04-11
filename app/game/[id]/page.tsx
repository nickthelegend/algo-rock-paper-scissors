import { GameRoom } from "@/components/game-room"
import { ThemeToggle } from "@/components/theme-toggle"
import { initializeGame } from "@/lib/actions"

export default function GamePage({ params }: { params: { id: string } }) {
  // Initialize the game on the server
  initializeGame(params.id)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <GameRoom gameId={params.id} />
    </div>
  )
}
