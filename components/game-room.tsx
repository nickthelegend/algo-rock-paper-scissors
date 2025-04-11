"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GameControls } from "@/components/game-controls"
import { GameResult } from "@/components/game-result"
import { type GameState, joinGame } from "@/lib/actions"
import { Copy, Share2, Wallet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { ConnectWallet } from "@/components/connect-wallet"
import { ThemeToggle } from "@/components/theme-toggle"

export function GameRoom({ gameId }: { gameId: string }) {
  const [isPlayer1, setIsPlayer1] = useState<boolean | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Get the balance from localStorage (in a real app, this would come from a database)
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    // In a real app, this would be fetched from the server
    // For now, we'll just simulate it with a random value if not found
    const storedBalance = localStorage.getItem("playerBalance")
    setBalance(storedBalance ? Number.parseFloat(storedBalance) : 5)
  }, [])

  // Join the game as player 1 if we're the creator
  useEffect(() => {
    const checkIfCreator = async () => {
      // If no localStorage entry exists, this is the creator
      const storedGameIds = localStorage.getItem("createdGames") || ""
      const isCreator = !storedGameIds.includes(gameId)

      if (isCreator) {
        // Store this game ID
        localStorage.setItem("createdGames", `${storedGameIds},${gameId}`)
        setIsPlayer1(true)
        await joinGame(gameId, true)
      } else {
        setIsPlayer1(false)
        await joinGame(gameId, false)
      }
    }

    checkIfCreator()
  }, [gameId])

  // Function to copy the game link
  const copyGameLink = () => {
    const url = `${window.location.origin}/game/${gameId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast({
      title: "Link copied!",
      description: "Share this with your friend to play together.",
    })

    setTimeout(() => setCopied(false), 2000)
  }

  if (isPlayer1 === null) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <div className="absolute top-4 right-4 flex items-center gap-4">
        {balance !== null && (
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
            <Wallet className="h-4 w-4" />
            <span className="font-medium">{balance} ALGOS</span>
          </div>
        )}
        <ConnectWallet />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <div className="relative w-8 h-8">
              <Image src="/rock.png" alt="Rock Paper Scissors" fill className="object-contain" sizes="32px" />
            </div>
            Rock Paper Scissors
          </CardTitle>
          <CardDescription>Game ID: {gameId}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center space-y-6">
          {isPlayer1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <Button
                onClick={copyGameLink}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                {copied ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? "Copied!" : "Share Game Link"}
              </Button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key="game-controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <GameControls gameId={gameId} isPlayer1={isPlayer1} setGameState={setGameState} />
            </motion.div>
          </AnimatePresence>

          {gameState?.result && (
            <GameResult
              result={gameState.result}
              player1Choice={gameState.player1Choice}
              player2Choice={gameState.player2Choice}
              gameId={gameId}
              isPlayer1={isPlayer1}
              setGameState={setGameState}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}
