"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { type Choice, type GameState, resetGame } from "@/lib/actions"
import { RotateCcw, AlertCircle, Trophy, Lock, Unlock, User, Swords } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import algosdk from "algosdk"
import { useToast } from "@/hooks/use-toast"
import { updateGameStatus } from "@/lib/supabase"
import { fetchApplicationState, isGameFinished } from "@/lib/algorand"
import { useRouter } from "next/navigation"
import { decrypt } from "@/lib/encryption"

type GameResultProps = {
  result: "player1" | "player2" | "draw" | null
  player1Choice: Choice | string | null
  player2Choice: Choice | string | null
  gameId: string
  isPlayer1: boolean
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
  player1Address?: string | null
  player2Address?: string | null
}

const METHODS = [
  new algosdk.ABIMethod({
    name: "sendFunds",
    desc: "",
    args: [{ type: "address", name: "player", desc: "" }],
    returns: { type: "void", desc: "" },
  }),
  new algosdk.ABIMethod({
    name: "setWinner",
    desc: "",
    args: [{ type: "address", name: "winner", desc: "" }],
    returns: { type: "void", desc: "" },
  }),
]

export function GameResult({
  result,
  player1Choice,
  player2Choice,
  gameId,
  isPlayer1,
  setGameState,
  player1Address,
  player2Address,
}: GameResultProps) {
  const [isResetting, setIsResetting] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [winnerAddress, setWinnerAddress] = useState<string | null>(null)
  const [decryptedPlayer1Choice, setDecryptedPlayer1Choice] = useState<Choice>(null)
  const [decryptedPlayer2Choice, setDecryptedPlayer2Choice] = useState<Choice>(null)
  const [isDecrypting, setIsDecrypting] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  // Decrypt the choices when component mounts
  useEffect(() => {
    async function decryptChoices() {
      setIsDecrypting(true)
      try {
        // Check if choices are encrypted strings
        if (
          typeof player1Choice === "string" &&
          player1Choice !== "rock" &&
          player1Choice !== "paper" &&
          player1Choice !== "scissors"
        ) {
          const decrypted1 = (await decrypt(player1Choice)) as Choice
          setDecryptedPlayer1Choice(decrypted1)
        } else {
          setDecryptedPlayer1Choice(player1Choice as Choice)
        }

        if (
          typeof player2Choice === "string" &&
          player2Choice !== "rock" &&
          player2Choice !== "paper" &&
          player2Choice !== "scissors"
        ) {
          const decrypted2 = (await decrypt(player2Choice)) as Choice
          setDecryptedPlayer2Choice(decrypted2)
        } else {
          setDecryptedPlayer2Choice(player2Choice as Choice)
        }
      } catch (error) {
        console.error("Error decrypting choices:", error)
      } finally {
        setIsDecrypting(false)
      }
    }

    if (player1Choice && player2Choice) {
      decryptChoices()
    }
  }, [player1Choice, player2Choice])

  // Check if the game is already finished
  useEffect(() => {
    const checkGameStatus = async () => {
      try {
        const appState = await fetchApplicationState(Number(gameId))
        const finished = isGameFinished(appState)
        setIsGameOver(finished)

        if (finished) {
          toast({
            title: "Game is already finished",
            description: "This game has already been completed. You cannot play again.",
          })
        }
      } catch (error) {
        console.error("Error checking game status:", error)
      }
    }

    checkGameStatus()
  }, [gameId, toast])

  // Set winner address based on result
  useEffect(() => {
    if (result === "player1" && player1Address) {
      setWinnerAddress(player1Address)
    } else if (result === "player2" && player2Address) {
      setWinnerAddress(player2Address)
    } else {
      setWinnerAddress(null)
    }
  }, [result, player1Address, player2Address])

  useEffect(() => {
    // Define an async function inside useEffect
    const processGameResult = async () => {
      // Skip if the game is already over
      if (isGameOver) return

      // Log the winner to the console
      if (result === "draw") {
        console.log("Game Result: It's a draw!")

        // For draws, we don't mark the game as completed so players can play again
        await updateGameStatus(Number(gameId), "in_progress", "draw")
      } else if (result === "player1") {
        console.log("Game Result: Player 1 won!")
        console.log(`Player 1 chose ${decryptedPlayer1Choice} and Player 2 chose ${decryptedPlayer2Choice}`)

        // Update game status in Supabase with winner address
        await updateGameStatus(Number(gameId), "completed", "player1", player1Address || undefined)

        if (player1Address) {
          try {
            // Initialize Algorand client
            const algodClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "")
            const suggestedParams = await algodClient.getTransactionParams().do()

            // Initialize admin account from mnemonic
            const admin = algosdk.mnemonicToSecretKey(
              "certain prevent choose close sail exile predict penalty hip silver syrup amount maximum domain income liquid evoke hockey thunder twenty labor play proud absent birth",
            )

            const atc = new algosdk.AtomicTransactionComposer()

            // Set winner in the smart contract
            atc.addMethodCall({
              appID: Number(gameId),
              method: METHODS[1], // setWinner method
              signer: algosdk.makeBasicAccountTransactionSigner(admin),
              methodArgs: [player1Address],
              sender: admin.addr,
              suggestedParams: { ...suggestedParams, fee: Number(30) },
              appAccounts: [player1Address],
            })

            // Send funds to winner
            atc.addMethodCall({
              appID: Number(gameId),
              method: METHODS[0], // sendFunds method
              signer: algosdk.makeBasicAccountTransactionSigner(admin),
              methodArgs: [player1Address],
              sender: admin.addr,
              suggestedParams: { ...suggestedParams, fee: Number(30) },
              appAccounts: [player1Address],
            })

            // Execute the transaction
            const txResult = await atc.execute(algodClient, 4)
            for (const mr of txResult.methodResults) {
              console.log(`${mr.returnValue}`)
            }

            console.log(`Winner's wallet address: ${player1Address}`)
            toast({
              title: "Funds sent to winner",
              description: "The prize has been sent to Player 1's wallet",
            })

            // Mark the game as over
            setIsGameOver(true)
          } catch (error) {
            console.error("Error sending funds to winner:", error)
            toast({
              title: "Error sending funds",
              description: "There was an error sending funds to the winner",
              variant: "destructive",
            })
          }
        }
      } else if (result === "player2") {
        console.log("Game Result: Player 2 won!")
        console.log(`Player 1 chose ${decryptedPlayer1Choice} and Player 2 chose ${decryptedPlayer2Choice}`)

        // Update game status in Supabase with winner address
        await updateGameStatus(Number(gameId), "completed", "player2", player2Address || undefined)

        if (player2Address) {
          try {
            // Initialize Algorand client
            const algodClient = new algosdk.Algodv2(
              "", // No token needed for PureStake
              "https://testnet-api.algonode.cloud",
              "",
            )
            const suggestedParams = await algodClient.getTransactionParams().do()

            // Initialize admin account from mnemonic
            const admin = algosdk.mnemonicToSecretKey(
              "certain prevent choose close sail exile predict penalty hip silver syrup amount maximum domain income liquid evoke hockey thunder twenty labor play proud absent birth",
            )

            const atc = new algosdk.AtomicTransactionComposer()

            // Set winner in the smart contract
            atc.addMethodCall({
              appID: Number(gameId),
              method: METHODS[1], // setWinner method
              signer: algosdk.makeBasicAccountTransactionSigner(admin),
              methodArgs: [player2Address],
              sender: admin.addr,
              suggestedParams: { ...suggestedParams, fee: Number(30) },
              appAccounts: [player2Address],
            })

            // Send funds to winner
            atc.addMethodCall({
              appID: Number(gameId),
              method: METHODS[0], // sendFunds method
              signer: algosdk.makeBasicAccountTransactionSigner(admin),
              methodArgs: [player2Address],
              sender: admin.addr,
              suggestedParams: { ...suggestedParams, fee: Number(30) },
              appAccounts: [player2Address],
            })

            // Execute the transaction
            const txResult = await atc.execute(algodClient, 4)
            for (const mr of txResult.methodResults) {
              console.log(`${mr.returnValue}`)
            }

            console.log(`Winner's wallet address: ${player2Address}`)
            toast({
              title: "Funds sent to winner",
              description: "The prize has been sent to Player 2's wallet",
            })

            // Mark the game as over
            setIsGameOver(true)
          } catch (error) {
            console.error("Error sending funds to winner:", error)
            toast({
              title: "Error sending funds",
              description: "There was an error sending funds to the winner",
              variant: "destructive",
            })
          }
        }
      }

      // Log additional information about the current player
      console.log(`You are ${isPlayer1 ? "Player 1" : "Player 2"}`)

      // Log the winning combination
      if (result !== "draw" && result !== null) {
        const winnerChoice = result === "player1" ? decryptedPlayer1Choice : decryptedPlayer2Choice
        const loserChoice = result === "player1" ? decryptedPlayer2Choice : decryptedPlayer1Choice
        console.log(`Winning combination: ${winnerChoice} beats ${loserChoice}`)
      }
    }

    // Call the async function
    if (result && !isDecrypting) {
      processGameResult()
    }
  }, [
    result,
    decryptedPlayer1Choice,
    decryptedPlayer2Choice,
    isPlayer1,
    player1Address,
    player2Address,
    gameId,
    toast,
    isGameOver,
    isDecrypting,
  ])

  const handleReset = async () => {
    // If the game is over, redirect to home to create a new game
    if (isGameOver) {
      router.push("/")
      return
    }

    // Otherwise, reset the current game
    setIsResetting(true)

    try {
      // Reset the game state on the server
      const updatedGameState = await resetGame(gameId)

      // Update the local game state to allow players to make new choices
      setGameState({
        player1Choice: null,
        player2Choice: null,
        player1Connected: true,
        player2Connected: true,
        result: null,
      })

      // Show success message
      toast({
        title: "Game Reset",
        description: "You can now make a new choice!",
      })

      // Force reload the page to reset all UI states
      window.location.reload()
    } catch (error) {
      console.error("Error resetting game:", error)
      toast({
        title: "Error",
        description: "Failed to reset the game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  const getChoiceImage = (choice: Choice) => {
    if (!choice) return null

    return (
      <div className="relative w-16 h-16">
        <Image src={`/${choice}.png`} alt={choice} fill className="object-contain" sizes="64px" />
      </div>
    )
  }

  const getResultMessage = () => {
    if (result === "draw") return "It's a draw!"

    const youWon = (isPlayer1 && result === "player1") || (!isPlayer1 && result === "player2")
    return youWon ? "You won!" : "You lost!"
  }

  const getResultColor = () => {
    if (result === "draw") return "bg-yellow-500"

    const youWon = (isPlayer1 && result === "player1") || (!isPlayer1 && result === "player2")
    return youWon ? "bg-green-500" : "bg-red-500"
  }

  // Function to truncate addresses for display
  const truncateAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  // Function to determine the winning move explanation
  const getWinningMoveExplanation = () => {
    if (result === "draw" || !decryptedPlayer1Choice || !decryptedPlayer2Choice) return null

    const winnerChoice = result === "player1" ? decryptedPlayer1Choice : decryptedPlayer2Choice
    const loserChoice = result === "player1" ? decryptedPlayer2Choice : decryptedPlayer1Choice

    const explanations: Record<string, string> = {
      "rock-scissors": "Rock crushes Scissors",
      "paper-rock": "Paper covers Rock",
      "scissors-paper": "Scissors cut Paper",
    }

    const key = `${winnerChoice}-${loserChoice}`
    return explanations[key] || null
  }

  if (isDecrypting) {
    return (
      <div className="w-full space-y-6 p-4 rounded-lg border">
        <div className="text-center">
          <Badge className="bg-blue-500">Decrypting Moves</Badge>
        </div>
        <div className="flex justify-center py-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Lock className="h-8 w-8 text-primary" />
          </motion.div>
        </div>
        <div className="text-center text-sm text-muted-foreground">Decrypting player moves for secure gameplay...</div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full space-y-6 p-4 rounded-lg border"
      >
        <div className="text-center">
          <Badge className={getResultColor()}>{getResultMessage()}</Badge>
        </div>

        {/* Game Result Summary */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-center mb-2">Game Result</h3>
          <div className="flex items-center justify-center gap-2 mb-3">
            {result === "draw" ? (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                Draw
              </Badge>
            ) : (
              <Badge variant="outline" className="text-green-500 border-green-500">
                {result === "player1" ? "Player 1 Won" : "Player 2 Won"}
              </Badge>
            )}
          </div>

          {result !== "draw" && (
            <div className="text-center text-sm mb-3">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{result === "player1" ? "Player 1" : "Player 2"} is the winner!</span>
              </div>
              {getWinningMoveExplanation() && (
                <div className="text-muted-foreground text-xs">{getWinningMoveExplanation()}</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div
            className={`flex flex-col items-center space-y-2 p-3 rounded-lg ${result === "player1" ? "bg-green-500/10" : result === "player2" ? "bg-red-500/10" : ""}`}
          >
            <div className="text-sm font-medium flex items-center gap-1">
              <User className="h-4 w-4" />
              {isPlayer1 ? "You (Player 1)" : "Player 1"}
              {result === "player1" && <Trophy className="h-4 w-4 text-yellow-500" />}
            </div>
            <motion.div
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {getChoiceImage(decryptedPlayer1Choice)}
            </motion.div>
            <div className="flex items-center gap-1 text-xs">
              <span className="capitalize">{decryptedPlayer1Choice}</span>
              <Unlock className="h-3 w-3 text-green-500" />
            </div>
            {player1Address && (
              <div className="text-xs text-muted-foreground mt-1 break-all">
                Address: {truncateAddress(player1Address)}
              </div>
            )}
          </div>

          <div
            className={`flex flex-col items-center space-y-2 p-3 rounded-lg ${result === "player2" ? "bg-green-500/10" : result === "player1" ? "bg-red-500/10" : ""}`}
          >
            <div className="text-sm font-medium flex items-center gap-1">
              <User className="h-4 w-4" />
              {!isPlayer1 ? "You (Player 2)" : "Player 2"}
              {result === "player2" && <Trophy className="h-4 w-4 text-yellow-500" />}
            </div>
            <motion.div
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {getChoiceImage(decryptedPlayer2Choice)}
            </motion.div>
            <div className="flex items-center gap-1 text-xs">
              <span className="capitalize">{decryptedPlayer2Choice}</span>
              <Unlock className="h-3 w-3 text-green-500" />
            </div>
            {player2Address && (
              <div className="text-xs text-muted-foreground mt-1 break-all">
                Address: {truncateAddress(player2Address)}
              </div>
            )}
          </div>
        </div>

        {/* Battle visualization */}
        {result !== "draw" && (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="relative w-10 h-10">
              <Image
                src={`/${result === "player1" ? decryptedPlayer1Choice : decryptedPlayer2Choice}.png`}
                alt="Winner choice"
                fill
                className="object-contain"
                sizes="40px"
              />
            </div>
            <Swords className="h-5 w-5 text-primary" />
            <div className="relative w-10 h-10 opacity-60">
              <Image
                src={`/${result === "player1" ? decryptedPlayer2Choice : decryptedPlayer1Choice}.png`}
                alt="Loser choice"
                fill
                className="object-contain"
                sizes="40px"
              />
            </div>
          </div>
        )}

        {/* Winner information */}
        {result !== "draw" && winnerAddress && (
          <div className="bg-green-500/10 text-green-500 p-3 rounded-lg flex items-center gap-2">
            <Trophy className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <p>
                <strong>{result === "player1" ? "Player 1" : "Player 2"} won the game!</strong>
              </p>
              <p className="text-xs mt-1">Winner Address: {truncateAddress(winnerAddress)}</p>
              <p className="text-xs mt-1">
                {result === "player1" ? "Player 1" : "Player 2"} chose{" "}
                {result === "player1" ? decryptedPlayer1Choice : decryptedPlayer2Choice} and
                {result === "player1" ? " Player 2" : " Player 1"} chose{" "}
                {result === "player1" ? decryptedPlayer2Choice : decryptedPlayer1Choice}
              </p>
            </div>
          </div>
        )}

        {result === "draw" && (
          <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <p>
                <strong>The game ended in a draw!</strong>
              </p>
              <p className="text-xs mt-1">Both players chose {decryptedPlayer1Choice}.</p>
              <p className="text-xs mt-1">Click "Play Again" to start a new round.</p>
            </div>
          </div>
        )}

        <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg flex items-center gap-2">
          <Lock className="h-4 w-4 flex-shrink-0" />
          <div className="text-sm">
            <p>Your moves were encrypted during gameplay for privacy.</p>
            <p className="text-xs mt-1">They are only decrypted when both players have made their choices.</p>
          </div>
        </div>

        {isGameOver ? (
          <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-lg flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              <p>
                <strong>This game is completed.</strong>
              </p>
              <p className="text-xs mt-1">You cannot play again with this game ID.</p>
              {result !== "draw" && (
                <p className="text-xs mt-1">
                  The prize of 10 ALGOS has been sent to {result === "player1" ? "Player 1" : "Player 2"}'s wallet.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <Button onClick={handleReset} className="w-full" disabled={isResetting}>
          {isResetting ? (
            <>
              <motion.div
                className="mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <RotateCcw className="h-4 w-4" />
              </motion.div>
              Resetting...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              {isGameOver ? "Create New Game" : "Play Again"}
            </>
          )}
        </Button>
      </motion.div>
    </AnimatePresence>
  )
}
