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
import algosdk from "algosdk"
import { useToast } from "@/hooks/use-toast"

// Import the encryption functions at the top of the file
import { encrypt, decrypt } from "@/lib/encryption"
const METHODS = [
  
  new algosdk.ABIMethod({ name: "createBox", desc: "", args: [], returns: { type: "void", desc: "" } }),
  new algosdk.ABIMethod({ name: "player1turn", desc: "", args: [{ type: "string", name: "move", desc: "" }], returns: { type: "void", desc: "" } }),
  new algosdk.ABIMethod({ name: "player2turn", desc: "", args: [{ type: "string", name: "move", desc: "" }], returns: { type: "void", desc: "" } }),

];

type GameControlsProps = {
  gameId: string
  isPlayer1: boolean
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
  appState?: any
}

export function GameControls({ gameId, isPlayer1, setGameState, appState }: GameControlsProps) {
  const [selectedChoice, setSelectedChoice] = useState<Choice>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [playerName, setPlayerName] = useState<string>("")
  const [opponentName, setOpponentName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const { activeAccount ,transactionSigner} = useWallet()
  const { toast } = useToast()
  const algodClient = new algosdk.Algodv2(
    "", // No token needed for PureStake
    "https://testnet-api.algonode.cloud",
    "",
  )

  if (!activeAccount) {
    toast({
      title: "Wallet not connected",
      description: "Please connect your wallet to create a game.",
      variant: "destructive",
    })
    return
  }
  // Check if both players have deposited
  useEffect(() => {
    if (appState) {
      const player1Deposited = hasPlayerDeposited(appState, PLAYER1_KEY)
      const player2Deposited = hasPlayerDeposited(appState, PLAYER2_KEY)

      setWaitingForOpponent(!player1Deposited || !player2Deposited)
    }
  }, [appState])

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
    if(!choice){
      return
    }
    // Encrypt the choice
    try {
      const encryptedMoveName = await encrypt(choice)
      console.log("Encrypted move:", encryptedMoveName)
      const suggestedParams = await algodClient.getTransactionParams().do()

      const atc = new algosdk.AtomicTransactionComposer();
      const boxKey = algosdk.coerceToBytes('player1Move');

      atc.addMethodCall({
        appID: Number(gameId),
        method: METHODS[0], // your ABI method (buyNFT)
        signer: transactionSigner,
        methodArgs: [], 
        sender: activeAccount.address,
        suggestedParams: { ...suggestedParams, fee: Number(30) },
      });

      atc.addMethodCall({
        appID: Number(gameId),
        method: METHODS[1], // your ABI method (buyNFT)
        signer: transactionSigner,
        methodArgs: [encryptedMoveName], 
        sender: activeAccount.address,
        suggestedParams: { ...suggestedParams, fee: Number(30) },
        boxes:[{
          appIndex: Number(gameId),
          name: boxKey,
        },]
      });

      const result = await atc.execute(algodClient, 4);
      for (const mr of result.methodResults) {
        console.log(`${mr.returnValue}`);
      }
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
            <p>Both players need to deposit funds before the game can start.</p>
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
          You chose {selectedChoice}. Waiting for your opponent to make their choice...
        </motion.div>
      )}
    </div>
  )
}
