import { createClient } from "@supabase/supabase-js"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Game types
export interface Game {
  id?: number
  app_id: number
  app_address: string
  player1_address: string
  player2_address?: string
  created_at?: string
  status?: "created" | "in_progress" | "completed" | string
  winner?: "player1" | "player2" | "draw"
}

// Function to insert a new game
export async function insertGame(game: Game): Promise<Game | null> {
  try {
    const { data, error } = await supabase.from("games").insert([game]).select().single()

    if (error) {
      console.error("Error inserting game:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Failed to insert game:", error)
    return null
  }
}

// Function to get a game by app_id
export async function getGameByAppId(appId: number): Promise<Game | null> {
  try {
    const { data, error } = await supabase.from("games").select("*").eq("app_id", appId).single()

    if (error) {
      console.error("Error getting game:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Failed to get game:", error)
    return null
  }
}

// Function to update game status to completed and set winner
export async function updateGameStatus(
  appId: number, 
  status: "created" | "in_progress" | "completed", 
  winner?: "player1" | "player2" | "draw"
): Promise<Game | null> {
  try {
    const updateData: Partial<Game> = { status }
    if (winner) {
      updateData.winner = winner
    }
    
    const { data, error } = await supabase
      .from("games")
      .update(updateData)
      .eq("app_id", appId)
      .select()
      .single()

    if (error) {
      console.error("Error updating game status:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Failed to update game status:", error)
    return null
  }
}
