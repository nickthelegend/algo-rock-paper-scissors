"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { type Choice, type GameState, resetGame } from "@/lib/actions"
import { RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import algosdk from "algosdk"
import { useToast } from "@/hooks/use-toast"
import { access } from "fs"

type GameResultProps = {
  result: "player1" | "player2" | "draw" | null
  player1Choice: Choice
  player2Choice: Choice
  gameId: string
  isPlayer1: boolean
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
}


const METHODS = [
  
  new algosdk.ABIMethod({ name: "createBox", desc: "", args: [], returns: { type: "void", desc: "" } }),
  new algosdk.ABIMethod({ name: "player1turn", desc: "", args: [{ type: "string", name: "move", desc: "" }], returns: { type: "void", desc: "" } }),
  new algosdk.ABIMethod({ name: "player2turn", desc: "", args: [{ type: "string", name: "move", desc: "" }], returns: { type: "void", desc: "" } }),

];
export async function GameResult({ result, player1Choice, player2Choice, gameId, isPlayer1, setGameState }: GameResultProps) {
  const [isResetting, setIsResetting] = useState(false)
  const { toast } = useToast()
  const algodClient = new algosdk.Algodv2(
    "", // No token needed for PureStake
    "https://testnet-api.algonode.cloud",
    "",
  )
  const suggestedParams = await algodClient.getTransactionParams().do()

 
  
  useEffect(() => {
    // Log the winner to the console
    if (result === "draw") {
      console.log("Game Result: It's a draw!")
    } else if (result === "player1") {
      console.log("Game Result: Player 1 won!")


      const admin = algosdk.mnemonicToSecretKey(
        "certain prevent choose close sail exile predict penalty hip silver syrup amount maximum domain income liquid evoke hockey thunder twenty labor play proud absent birth",
      )

      const atc = new algosdk.AtomicTransactionComposer();
      const boxKey = algosdk.coerceToBytes('player1Move');
    
      
      atc.addMethodCall({
        appID: Number(gameId),
        method: METHODS[1], // your ABI method (buyNFT)
        signer: algosdk.makeBasicAccountTransactionSigner(account),
        methodArgs: [player2], 
        sender: admin.addr,
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











      console.log(`Player 1 chose ${player1Choice} and Player 2 chose ${player2Choice}`)
    } else if (result === "player2") {
      console.log("Game Result: Player 2 won!")
      console.log(`Player 1 chose ${player1Choice} and Player 2 chose ${player2Choice}`)
    }

    // Log additional information about the current player
    console.log(`You are ${isPlayer1 ? "Player 1" : "Player 2"}`)

    // Log the winning combination
    if (result !== "draw" && result !== null) {
      const winnerChoice = result === "player1" ? player1Choice : player2Choice
      const loserChoice = result === "player1" ? player2Choice : player1Choice
      console.log(`Winning combination: ${winnerChoice} beats ${loserChoice}`)
    }
  }, [result, player1Choice, player2Choice, isPlayer1])

  const handleReset = async () => {
    setIsResetting(true)
    const updatedGameState = await resetGame(gameId)
    setGameState(updatedGameState)
    setIsResetting(false)
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

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center space-y-2">
            <div className="text-sm font-medium">{isPlayer1 ? "You" : "Player 1"}</div>
            <motion.div
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {getChoiceImage(player1Choice)}
            </motion.div>
            <div className="text-xs capitalize">{player1Choice}</div>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <div className="text-sm font-medium">{!isPlayer1 ? "You" : "Player 2"}</div>
            <motion.div
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {getChoiceImage(player2Choice)}
            </motion.div>
            <div className="text-xs capitalize">{player2Choice}</div>
          </div>
        </div>

        <Button onClick={handleReset} className="w-full" disabled={isResetting}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Play Again
        </Button>
      </motion.div>
    </AnimatePresence>
  )
}
