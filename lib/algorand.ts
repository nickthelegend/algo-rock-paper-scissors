// Function to fetch application state from Algorand indexer
export async function fetchApplicationState(appId: number) {
    try {
      const response = await fetch(`https://testnet-idx.4160.nodely.dev/v2/applications/${appId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch application state: ${response.statusText}`)
      }
  
      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error fetching application state:", error)
      throw error
    }
  }
  
  // Function to check if a player has deposited
  export function hasPlayerDeposited(appState: any, playerKey: string): boolean {
    if (
      !appState ||
      !appState.application ||
      !appState.application.params ||
      !appState.application.params["global-state"]
    ) {
      return false
    }
  
    const globalState = appState.application.params["global-state"]
    return globalState.some((item: any) => item.key === playerKey)
  }
  
  // Base64 encoded keys
  export const PLAYER1_KEY = "cGxheWVyMQ=="
  export const PLAYER2_KEY = "cGxheWVyMg=="
  