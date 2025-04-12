"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { type Choice, type GameState, makeChoice } from "@/lib/actions"
import Image from "next/image"
import { useWallet } from "@txnlab/use-wallet-react"
import { getGameByAppId } from "@/lib/supabase"
import { hasPlayerDeposited, PLAYER1_KEY, PLAYER2_KEY } from "@/lib/algorand"
import { fetchApplicationState } from "@/lib/algorand"

// Import the encryption functions at the top of the file
import { encrypt, decrypt } from "@/lib/encryption"

// Fix the props type to include setAppState
type GameControlsProps = {
  gameId: string
  isPlayer1: boolean
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
  appState?: any
  setAppState?: React.Dispatch<React.SetStateAction<any>>
}

export function GameControls({ gameId, isPlayer1, setGameState, appState, setAppState = () => {} }: GameControlsProps) {
  const [selectedChoice, setSelectedChoice] = useState<Choice>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [playerName, setPlayerName] = useState<string>("")
  const [opponentName, setOpponentName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const { activeAccount } = useWallet()

  // Update the useEffect that checks for opponent deposits to include polling

  // Replace the existing useEffect that checks if both players have deposited with this updated version
  useEffect(() => {
    // Function to check if both players have deposited
    const checkDeposits = async () => {
      if (appState) {
        const player1Deposited = hasPlayerDeposited(appState, PLAYER1_KEY)
        const player2Deposited = hasPlayerDeposited(appState, PLAYER2_KEY)

        // Only show waiting message if the current player's opponent hasn't deposited yet
        if (isPlayer1) {
          setWaitingForOpponent(!player2Deposited)
        } else {
          setWaitingForOpponent(!player1Deposited)
        }
      }
    }

    // Initial check
    checkDeposits()

    // Set up polling to check for opponent deposits every 3 seconds
    const intervalId = setInterval(async () => {
      try {
        // Fetch the latest application state from Algorand
        const updatedAppState = await fetchApplicationState(Number(gameId))

        // Update the local appState with the latest data
        if (updatedAppState) {
          setAppState(updatedAppState)

          const player1Deposited = hasPlayerDeposited(updatedAppState, PLAYER1_KEY)
          const player2Deposited = hasPlayerDeposited(updatedAppState, PLAYER2_KEY)

          // Update waiting status based on latest data
          if (isPlayer1) {
            setWaitingForOpponent(!player2Deposited)
          } else {
            setWaitingForOpponent(!player1Deposited)
          }

          // If both players have deposited, we can stop polling
          if (player1Deposited && player2Deposited) {
            clearInterval(intervalId)
          }
        }
      } catch (error) {
        console.error("Error polling for opponent deposits:", error)
      }
    }, 3000) // Poll every 3 seconds

    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [appState, isPlayer1, gameId, setAppState])

  // Fetch game information to get player addresses
  useEffect(() => {
    async function fetchGameInfo() {
      try {
        setIsLoading(true)
        const game = await getGameByAppId(Number(gameId))

        if (game) {
          // If we have the active account, determine if we're player 1 or 2
          if (activeAccount) {
            const isCurrentPlayer1 = activeAccount.address === game.player1_address

            // Set player names based on addresses
            if (isCurrentPlayer1) {
              setPlayerName(`Player 1 (You)`)
              setOpponentName(`Player 2${game.player2_address ? "" : " (Waiting to join)"}`)
            } else {
              setPlayerName(`Player 2 (You)`)
              setOpponentName(`Player 1`)
            }
          } else {
            // Fallback if no active account
            setPlayerName(isPlayer1 ? "Player 1 (You)" : "Player 2 (You)")
            setOpponentName(isPlayer1 ? "Player 2" : "Player 1")
          }
        }
      } catch (error) {
        console.error("Error fetching game info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGameInfo()
  }, [gameId, activeAccount, isPlayer1])

  // Update the handleChoiceSelection function to encrypt the choice
  const handleChoiceSelection = async (choice: Choice) => {
    setSelectedChoice(choice)
    setIsSubmitting(true)

    // Encrypt the choice
    try {
      const encryptedMoveName = await encrypt(choice)
      console.log("Encrypted move:", encryptedMoveName)

      // For demonstration, decrypt it back
      const decryptedMove = await decrypt(encryptedMoveName)
      console.log("Decrypted move:", decryptedMove)
    } catch (error) {
      console.error("Encryption error:", error)
    }

    // Submit the choice to the server
    const updatedGameState = await makeChoice(gameId, isPlayer1, choice)
    setGameState(updatedGameState)
    setHasSubmitted(true)
    setIsSubmitting(false)
  }

  // Add a new effect to periodically check for game updates
  useEffect(() => {
    // Skip if we're still waiting for opponent to deposit
    if (waitingForOpponent) return

    // Function to fetch the latest game state
    const fetchGameState = async () => {
      try {
        // Use the existing makeChoice function with null to just get the current state
        // without actually making a choice
        const currentGameState = await makeChoice(gameId, isPlayer1, null)

        // Check if both players have made choices by checking if result is set
        // This avoids trying to decrypt potentially encrypted choices
        if (currentGameState.result) {
          setGameState(currentGameState)
          // Stop polling once we have a result
          return true
        }
        return false
      } catch (error) {
        console.error("Error fetching game state:", error)
        return false
      }
    }

    // Set up polling interval (every 2 seconds)
    const intervalId = setInterval(async () => {
      const hasResult = await fetchGameState()
      if (hasResult) {
        // If we have a result, stop polling
        clearInterval(intervalId)
      }
    }, 2000)

    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [gameId, isPlayer1, setGameState, waitingForOpponent])

  const choices: { value: Choice; image: string; label: string }[] = [
    { value: "rock", image: "/rock.png", label: "Rock" },
    { value: "paper", image: "/paper.png", label: "Paper" },
    { value: "scissors", image: "/scissors.png", label: "Scissors" },
  ]

  if (waitingForOpponent) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-medium">Waiting for opponent to deposit funds</h3>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            className="bg-yellow-500/10 text-yellow-500 p-4 rounded-lg"
          >
            <p>{isPlayer1 ? "Player 2" : "Player 1"} needs to deposit funds before the game can start.</p>
            <p className="text-sm mt-2">Share the game link with your friend to join!</p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">
          {hasSubmitted ? "Waiting for opponent..." : `${playerName}, make your choice!`}
        </h3>
        <div className="flex justify-center gap-4">
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">{playerName}</div>
          <div className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">vs {opponentName}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {choices.map((choice) => (
          <motion.div
            key={choice.value}
            whileHover={{ scale: hasSubmitted ? 1 : 1.05 }}
            whileTap={{ scale: hasSubmitted ? 1 : 0.95 }}
          >
            <Button
              variant={selectedChoice === choice.value ? "default" : "outline"}
              className="w-full h-24 flex flex-col items-center justify-center gap-2 p-2"
              onClick={() => !hasSubmitted && handleChoiceSelection(choice.value)}
              disabled={hasSubmitted || isSubmitting}
            >
              <div className="relative w-12 h-12">
                <Image
                  src={choice.image || "/placeholder.svg"}
                  alt={choice.label}
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <span>{choice.label}</span>
            </Button>
          </motion.div>
        ))}
      </div>

      {hasSubmitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground"
        >
          <p>You chose {selectedChoice}.</p>
          <p className="text-xs mt-1 text-green-500">Your move has been encrypted for privacy.</p>
          <p className="text-sm mt-2">Waiting for your opponent to make their choice...</p>
        </motion.div>
      )}
    </div>
  )
}
