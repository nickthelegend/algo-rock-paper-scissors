"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { type Choice, type GameState, makeChoice } from "@/lib/actions"
import Image from "next/image"

type GameControlsProps = {
  gameId: string
  isPlayer1: boolean
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>
}

export function GameControls({ gameId, isPlayer1, setGameState }: GameControlsProps) {
  const [selectedChoice, setSelectedChoice] = useState<Choice>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChoiceSelection = async (choice: Choice) => {
    setSelectedChoice(choice)
    setIsSubmitting(true)

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

  return (
    <div className="w-full space-y-6">
      <h3 className="text-center text-lg font-medium">
        {hasSubmitted ? "Waiting for opponent..." : `You are Player ${isPlayer1 ? "1" : "2"}. Make your choice!`}
      </h3>

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
