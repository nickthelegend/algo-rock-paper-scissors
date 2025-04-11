import { GameRoom } from "@/components/game-room"
import { initializeGame } from "@/lib/actions"

export default async function GamePage({ params }: { params: { id: string } }) {
  // Initialize the game on the server
  await initializeGame(params.id)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <GameRoom gameId={params.id} />
    </div>
  )
}
