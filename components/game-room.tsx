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
import { useWallet } from "@txnlab/use-wallet-react"
import { DepositFunds } from "@/components/deposit-funds"

export function GameRoom({ gameId }: { gameId: string }) {
  const [isPlayer1, setIsPlayer1] = useState<boolean>(false) // Default to false instead of null
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasDeposited, setHasDeposited] = useState(false)
  const [balance, setBalance] = useState(0)
  const [isJoined, setIsJoined] = useState(false) // Track if player has joined
  const { toast } = useToast()
  const { activeAccount } = useWallet()

  // Join the game as player 1 if we're the creator
  useEffect(() => {
    const checkIfCreator = async () => {
      if (!activeAccount) return

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

      setIsJoined(true)
    }

    checkIfCreator()
  }, [gameId, activeAccount])

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

  const handleDeposit = (amount: number) => {
    setBalance(amount)
    setHasDeposited(true)
  }

  return (
    <>
      <div className="absolute top-4 right-4 flex items-center gap-4">
        {hasDeposited && (
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
            <Wallet className="h-4 w-4" />
            <span className="font-medium">{balance} ALGOS</span>
          </div>
        )}
        <ConnectWallet />
        <ThemeToggle />
      </div>

      {!activeAccount ? (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Connect Your Wallet</CardTitle>
            <CardDescription>Please connect your wallet to play the game</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="mb-6">
              <Image src="/rock.png" alt="Rock Paper Scissors" width={100} height={100} />
            </div>
            <ConnectWallet />
          </CardContent>
        </Card>
      ) : !hasDeposited ? (
        <DepositFunds onDeposit={handleDeposit} gameId={Number.parseInt(gameId)} />
      ) : (
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
      )}
    </>
  )
}
