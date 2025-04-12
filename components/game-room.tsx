"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GameControls } from "@/components/game-controls"
import { GameResult } from "@/components/game-result"
import { type GameState, joinGame } from "@/lib/actions"
import { Copy, Share2, Wallet, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { ConnectWallet } from "@/components/connect-wallet"
import { ThemeToggle } from "@/components/theme-toggle"
import { useWallet } from "@txnlab/use-wallet-react"
import { DepositFunds } from "@/components/deposit-funds"
import { fetchApplicationState, hasPlayerDeposited, isGameFinished, PLAYER1_KEY, PLAYER2_KEY } from "@/lib/algorand"
import { getGameByAppId, updatePlayer2Address } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function GameRoom({ gameId }: { gameId: string }) {
  const [isPlayer1, setIsPlayer1] = useState<boolean>(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasDeposited, setHasDeposited] = useState(false)
  const [needsDeposit, setNeedsDeposit] = useState(false)
  const [balance, setBalance] = useState(0)
  const [isJoined, setIsJoined] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [appState, setAppState] = useState<any>(null)
  const [player1Address, setPlayer1Address] = useState<string | null>(null)
  const [player2Address, setPlayer2Address] = useState<string | null>(null)
  const [isGameFinishedState, setIsGameFinishedState] = useState(false)
  const [gameResetKey, setGameResetKey] = useState(0) // Add a key to force re-render
  const { toast } = useToast()
  const { activeAccount } = useWallet()
  const router = useRouter()

  // Fetch application state and check if player has deposited
  useEffect(() => {
    const checkApplicationState = async () => {
      if (!activeAccount) return

      try {
        // Don't set loading state during polling to avoid UI flicker
        const isInitialLoad = isLoading
        if (isInitialLoad) {
          setIsLoading(true)
        }

        // Fetch game info from Supabase
        const game = await getGameByAppId(Number(gameId))
        if (game) {
          setPlayer1Address(game.player1_address)
          if (game.player2_address) {
            setPlayer2Address(game.player2_address)
          }

          // Determine if current user is player1
          const currentIsPlayer1 = activeAccount.address === game.player1_address
          setIsPlayer1(currentIsPlayer1)

          // If player2 is not set and this is not player1, update player2 address
          if (!game.player2_address && !currentIsPlayer1) {
            // In a real app, you would update the database here
            setPlayer2Address(activeAccount.address)

            // Update player2 address in Supabase
            const updated = await updatePlayer2Address(Number(gameId), activeAccount.address)
            if (updated) {
              toast({
                title: "Joined game successfully",
                description: "You've joined as Player 2",
              })
            } else {
              toast({
                title: "Warning",
                description: "Joined game, but failed to update database record",
                variant: "destructive",
              })
            }
          }

          // Check if game is already completed in Supabase
          if (game.status === "completed") {
            setIsGameFinishedState(true)
            if (isInitialLoad) {
              toast({
                title: "Game is already finished",
                description: "This game has already been completed. You cannot play again.",
              })
            }
            return true // Game is finished, return true to stop polling
          }
        }

        // Fetch application state from Algorand
        const state = await fetchApplicationState(Number(gameId))
        setAppState(state)

        // Check if game is finished on the blockchain
        const finished = isGameFinished(state)
        if (finished) {
          setIsGameFinishedState(true)
          if (isInitialLoad) {
            toast({
              title: "Game is already finished",
              description: "This game has already been completed. You cannot play again.",
            })
          }
          return true // Game is finished, return true to stop polling
        }

        // Check if player has deposited
        const player1Deposited = hasPlayerDeposited(state, PLAYER1_KEY)
        const player2Deposited = hasPlayerDeposited(state, PLAYER2_KEY)

        if (isPlayer1) {
          // If player1, check if player1 has deposited
          if (player1Deposited) {
            setHasDeposited(true)
            setNeedsDeposit(false)
          } else {
            setNeedsDeposit(true)
          }
        } else {
          // If player2, check if player2 has deposited
          if (player2Deposited) {
            setHasDeposited(true)
            setNeedsDeposit(false)
          } else {
            setNeedsDeposit(true)
          }
        }

        setIsJoined(true)
        return false // Game is not finished, continue polling
      } catch (error) {
        console.error("Error checking application state:", error)
        if (isLoading) {
          toast({
            title: "Error",
            description: "Failed to check game state. Please try again.",
            variant: "destructive",
          })
        }
        return false
      } finally {
        if (isLoading) {
          setIsLoading(false)
        }
      }
    }

    // Initial check
    checkApplicationState()

    // Set up polling to check for game state updates every 5 seconds
    const intervalId = setInterval(async () => {
      // If the game is finished, stop polling
      const isFinished = await checkApplicationState()
      if (isFinished || isGameFinishedState) {
        clearInterval(intervalId)
      }
    }, 5000)

    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [gameId, activeAccount, toast, isPlayer1, gameResetKey, isLoading, isGameFinishedState])

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
    setNeedsDeposit(false)
  }

  // Function to handle game state updates
  const handleGameStateUpdate = (updatedGameState: GameState) => {
    setGameState(updatedGameState)

    // If we have a result, show a toast notification
    if (updatedGameState.result && !gameState?.result) {
      const resultMessage =
        updatedGameState.result === "draw"
          ? "It's a draw!"
          : (isPlayer1 && updatedGameState.result === "player1") ||
              (!isPlayer1 && updatedGameState.result === "player2")
            ? "You won!"
            : "You lost!"

      toast({
        title: "Game Result",
        description: resultMessage,
      })
    }
  }

  // Function to create a new game
  const handleCreateNewGame = () => {
    router.push("/")
  }

  // Function to handle game reset
  const handleGameReset = () => {
    // Increment the reset key to force re-render of components
    setGameResetKey((prev) => prev + 1)

    // Reset the local game state
    setGameState({
      player1Choice: null,
      player2Choice: null,
      player1Connected: true,
      player2Connected: true,
      result: null,
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
        <div className="absolute top-4 right-4 flex items-center gap-4">
          <ConnectWallet />
          <ThemeToggle />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Loading Game</CardTitle>
            <CardDescription>Checking game state...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <Loader2 className="h-8 w-8 text-primary" />
            </motion.div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If the game is finished and there's no result yet, show a message
  if (isGameFinishedState && !gameState?.result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
        <div className="absolute top-4 right-4 flex items-center gap-4">
          <ConnectWallet />
          <ThemeToggle />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Game Completed</CardTitle>
            <CardDescription>This game has already been finished</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="bg-yellow-500/10 text-yellow-500 p-4 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p>This game has already been completed.</p>
                <p className="text-sm mt-1">You need to create a new game to play again.</p>
              </div>
            </div>

            <div className="relative w-24 h-24">
              <Image src="/rock.png" alt="Rock Paper Scissors" fill className="object-contain" sizes="96px" />
            </div>

            <Button onClick={handleCreateNewGame} className="w-full">
              Create New Game
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
      ) : needsDeposit ? (
        <DepositFunds
          onDeposit={handleDeposit}
          gameId={Number.parseInt(gameId)}
          isPlayer1={isPlayer1}
          player1Address={player1Address}
        />
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
            {isPlayer1 && !isGameFinishedState && (
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
                key={`game-controls-${gameResetKey}`} // Add key with gameResetKey to force re-render
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                {!isGameFinishedState ? (
                  <GameControls
                    gameId={gameId}
                    isPlayer1={isPlayer1}
                    setGameState={handleGameStateUpdate}
                    appState={appState}
                    setAppState={setAppState}
                  />
                ) : (
                  <div className="bg-yellow-500/10 text-yellow-500 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p>This game has been completed.</p>
                      <p className="text-sm mt-1">Create a new game to play again.</p>
                    </div>
                  </div>
                )}
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
                player1Address={player1Address}
                player2Address={player2Address}
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}
