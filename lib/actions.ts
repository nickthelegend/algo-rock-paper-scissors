"use server"

import { redirect } from "next/navigation"
import { encrypt, decrypt } from "./encryption"

// Generate a random numeric ID for the game
function generateGameId(): string {
  return Math.floor(100000000 + Math.random() * 900000000).toString()
}

// Create a new game and redirect to the game page
export async function createGame() {
  const gameId = generateGameId()
  redirect(`/game/${gameId}`)
}

// Game choices
export type Choice = "rock" | "paper" | "scissors" | null

// Game state
export type GameState = {
  player1Choice: Choice | string | null // Can be encrypted string
  player2Choice: Choice | string | null // Can be encrypted string
  player1Connected: boolean
  player2Connected: boolean
  result: "player1" | "player2" | "draw" | null
}

// In-memory game state storage (would use a database in production)
const games = new Map<string, GameState>()

// Initialize a game
export async function initializeGame(gameId: string): Promise<GameState> {
  if (!games.has(gameId)) {
    games.set(gameId, {
      player1Choice: null,
      player2Choice: null,
      player1Connected: false,
      player2Connected: false,
      result: null,
    })
  }
  return games.get(gameId)!
}

// Join a game
export async function joinGame(gameId: string, isPlayer1: boolean): Promise<GameState> {
  const game = await initializeGame(gameId)

  if (isPlayer1) {
    game.player1Connected = true
  } else {
    game.player2Connected = true
  }

  games.set(gameId, game)
  return game
}

// Update the makeChoice function to handle null choice (used for polling) and encrypt choices
export async function makeChoice(gameId: string, isPlayer1: boolean, choice: Choice): Promise<GameState> {
  const game = games.get(gameId) || (await initializeGame(gameId))

  // If choice is null, just return the current game state without making changes
  // This allows us to use this function for polling the current state
  if (choice !== null) {
    try {
      // Encrypt the choice before storing it
      const encryptedChoice = await encrypt(choice)

      if (isPlayer1) {
        game.player1Choice = encryptedChoice
      } else {
        game.player2Choice = encryptedChoice
      }

      // Check if both players have made a choice
      if (game.player1Choice && game.player2Choice) {
        // Decrypt choices for determining the winner
        const decryptedPlayer1Choice = (await decrypt(game.player1Choice as string)) as Choice
        const decryptedPlayer2Choice = (await decrypt(game.player2Choice as string)) as Choice

        // Determine the winner using decrypted choices
        game.result = determineWinner(decryptedPlayer1Choice, decryptedPlayer2Choice)
      }

      games.set(gameId, game)
    } catch (error) {
      console.error("Error encrypting/decrypting choice:", error)
    }
  }

  return game
}

// Determine the winner
function determineWinner(player1Choice: Choice, player2Choice: Choice): "player1" | "player2" | "draw" {
  if (player1Choice === player2Choice) return "draw"

  if (
    (player1Choice === "rock" && player2Choice === "scissors") ||
    (player1Choice === "paper" && player2Choice === "rock") ||
    (player1Choice === "scissors" && player2Choice === "paper")
  ) {
    return "player1"
  }

  return "player2"
}

// Reset the game
export async function resetGame(gameId: string): Promise<GameState> {
  const game = games.get(gameId) || (await initializeGame(gameId))

  game.player1Choice = null
  game.player2Choice = null
  game.result = null

  games.set(gameId, game)
  return game
}
