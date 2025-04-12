"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { ConnectWallet } from "@/components/connect-wallet"
import { AlertCircle, Loader2, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useWallet } from "@txnlab/use-wallet-react"
import { GameClient } from "@/contracts/GameClient"
import algosdk from "algosdk"
import { useToast } from "@/hooks/use-toast"
import { insertGame, getAllGames, type Game } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"

export default function Home() {
  const router = useRouter()
  const { activeAccount } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeGames, setActiveGames] = useState<Game[]>([])
  const [completedGames, setCompletedGames] = useState<Game[]>([])
  const [gameIdInput, setGameIdInput] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const { toast } = useToast()

  // Fetch games from Supabase
  useEffect(() => {
    async function fetchGames() {
      try {
        setIsLoading(true)
        const games = await getAllGames()

        if (games) {
          // Filter active and completed games
          const active = games.filter((game) => game.status !== "completed")
          const completed = games.filter((game) => game.status === "completed")

          setActiveGames(active)
          setCompletedGames(completed)
        }
      } catch (error) {
        console.error("Error fetching games:", error)
        toast({
          title: "Failed to load games",
          description: "Could not retrieve game data from the database.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchGames()
  }, [toast])

  const handleCreateGame = async () => {
    if (!activeAccount) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a game.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreating(true)

      // Initialize Algorand client
      const algorandClient = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "443")

      // Initialize admin account from mnemonic
      const admin = algosdk.mnemonicToSecretKey(
        "certain prevent choose close sail exile predict penalty hip silver syrup amount maximum domain income liquid evoke hockey thunder twenty labor play proud absent birth",
      )

      // Create GameClient
      const Caller = new GameClient(
        {
          sender: admin,
          resolveBy: "id",
          id: 0,
        },
        algorandClient,
      )

      // Create application
      await Caller.create.createApplication({
        player1: activeAccount.address,
      })

      // Get application reference
      const { appId, appAddress } = await Caller.appClient.getAppReference()

      // Convert appId to number if it's a bigint
      const appIdNumber = typeof appId === "bigint" ? Number(appId) : appId

      // Store game information in Supabase
      const gameData = {
        app_id: appIdNumber,
        app_address: appAddress,
        player1_address: activeAccount.address,
        status: "created",
      }

      const insertedGame = await insertGame(gameData)

      if (!insertedGame) {
        throw new Error("Failed to store game information")
      }

      toast({
        title: "Game created successfully!",
        description: `Game ID: ${appIdNumber}`,
      })

      // Navigate to the game page using the appId as gameId
      router.push(`/game/${appIdNumber}`)
    } catch (error) {
      console.error("Error creating game:", error)
      toast({
        title: "Failed to create game",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinGame = (gameId: number) => {
    router.push(`/game/${gameId}`)
  }

  const handleJoinByGameId = () => {
    if (!gameIdInput.trim()) {
      toast({
        title: "Game ID required",
        description: "Please enter a valid Game ID to join.",
        variant: "destructive",
      })
      return
    }

    setIsJoining(true)
    
    try {
      // Validate that the input is a number
      const gameId = parseInt(gameIdInput.trim())
      if (isNaN(gameId)) {
        throw new Error("Game ID must be a number")
      }
      
      // Navigate to the game page
      router.push(`/game/${gameId}`)
    } catch (error) {
      toast({
        title: "Invalid Game ID",
        description: "Please enter a valid numeric Game ID.",
        variant: "destructive",
      })
      setIsJoining(false)
    }
  }

  // Function to truncate addresses for display
  const truncateAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Function to get winner address based on game data
  const getWinnerAddress = (game: Game): string => {
    if (!game.winner) return "Unknown"

    if (game.winner === "player1") {
      return game.player1_address
    } else if (game.winner === "player2") {
      return game.player2_address || "Unknown"
    } else {
      return "Draw - No Winner"
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <ConnectWallet />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-4xl mx-auto mt-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold flex items-center justify-center gap-2">
            <div className="relative w-10 h-10">
              <Image src="/rock.png" alt="Rock Paper Scissors" fill className="object-contain" sizes="40px" />
            </div>
            Rock Paper Scissors
          </h1>
          <p className="text-muted-foreground mt-2">Challenge your friends to a blockchain-powered game!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create Game Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">Create New Game</CardTitle>
              <CardDescription>Start a new challenge</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="relative w-16 h-16">
                  <Image src="/rock.png" alt="Rock" fill className="object-contain" sizes="64px" />
                </div>
                <div className="relative w-16 h-16">
                  <Image src="/paper.png" alt="Paper" fill className="object-contain" sizes="64px" />
                </div>
                <div className="relative w-16 h-16">
                  <Image src="/scissors.png" alt="Scissors" fill className="object-contain" sizes="64px" />
                </div>
              </div>

              {!activeAccount && (
                <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-lg flex items-center gap-2 w-full text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Please connect your wallet</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button onClick={handleCreateGame} className="w-full" disabled={!activeAccount || isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Game...
                  </>
                ) : (
                  "Create New Game"
                )}
              </Button>
              
              {/* Join by Game ID section */}
              <div className="w-full space-y-2">
                <div className="text-sm font-medium">Or join with Game ID:</div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Enter Game ID" 
                    value={gameIdInput}
                    onChange={(e) => setGameIdInput(e.target.value)}
                    className="flex-grow"
                  />
                  <Button 
                    onClick={handleJoinByGameId} 
                    disabled={isJoining || !gameIdInput.trim()}
                    size="icon"
                  >
                    {isJoining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>

          {/* Games List Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Game Rooms</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading games..."
                  : `${activeGames.length} active games, ${completedGames.length} completed games`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Tabs defaultValue="active">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="active" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Active Games ({activeGames.length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Completed Games ({completedGames.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="space-y-4">
                    {activeGames.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No active games found. Create a new game to get started!
                      </div>
                    ) : (
                      activeGames.map((game) => (
                        <div
                          key={game.app_id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col">
                            <div className="font-medium">Game #{game.app_id}</div>
                            <div className="text-xs text-muted-foreground">
                              <span className="text-primary font-medium">Creator:</span>{" "}
                              {truncateAddress(game.player1_address)}
                              {game.player2_address ? (
                                <span className="ml-2">
                                  <span className="text-primary font-medium">Opponent:</span>{" "}
                                  {truncateAddress(game.player2_address)}
                                </span>
                              ) : (
                                ""
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={game.player2_address ? "secondary" : "outline"}>
                              {game.player2_address ? "In Progress" : "Waiting"}
                            </Badge>
                            <Button size="sm" onClick={() => handleJoinGame(game.app_id)}>
                              {game.player2_address ? "View" : "Join"}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="completed" className="space-y-4">
                    {completedGames.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No completed games yet.</div>
                    ) : (
                      completedGames.map((game) => (
                        <div
                          key={game.app_id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex flex-col">
                            <div className="font-medium">Game #{game.app_id}</div>
                            <div className="text-xs text-muted-foreground">
                              <span className="text-primary font-medium">Creator:</span>{" "}
                              {truncateAddress(game.player1_address)}
                              {game.player2_address ? (
                                <span className="ml-2">
                                  <span className="text-primary font-medium">Opponent:</span>{" "}
                                  {truncateAddress(game.player2_address)}
                                </span>
                              ) : (
                                ""
                              )}
                            </div>
                            {game.winner && game.winner !== "draw" && (
                              <div className="text-xs mt-1">
                                <span className="text-green-500 font-medium">Winner:</span>{" "}
                                {truncateAddress(getWinnerAddress(game))}
                              </div>
                            )}
                            {game.winner === "draw" && (
                              <div className="text-xs mt-1">
                                <span className="text-yellow-500 font-medium">Result:</span> Draw
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                              Completed
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleJoinGame(game.app_id)}>
                              View
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
