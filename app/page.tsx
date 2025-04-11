"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { ConnectWallet } from "@/components/connect-wallet"
import { Users, AlertCircle, Loader2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useWallet } from "@txnlab/use-wallet-react"
import { GameClient } from "@/contracts/GameClient"
import algosdk from "algosdk"
import { useToast } from "@/hooks/use-toast"
import { insertGame } from "@/lib/supabase"

export default function Home() {
  const router = useRouter()
  const { activeAccount } = useWallet()
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <ConnectWallet />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <div className="relative w-8 h-8">
              <Image src="/rock.png" alt="Rock Paper Scissors" fill className="object-contain" sizes="32px" />
            </div>
            Rock Paper Scissors
          </CardTitle>
          <CardDescription>Challenge your friends to a game!</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="relative w-full h-64 flex items-center justify-center">
            <div className="flex items-center justify-center gap-4">
              <div className="relative w-24 h-24">
                <Image src="/rock.png" alt="Rock" fill className="object-contain" sizes="96px" />
              </div>
              <div className="relative w-24 h-24">
                <Image src="/paper.png" alt="Paper" fill className="object-contain" sizes="96px" />
              </div>
              <div className="relative w-24 h-24">
                <Image src="/scissors.png" alt="Scissors" fill className="object-contain" sizes="96px" />
              </div>
            </div>
          </div>

          {!activeAccount && (
            <div className="bg-yellow-500/10 text-yellow-500 p-4 rounded-lg flex items-center gap-2 w-full">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>Please connect your wallet to create a game</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button onClick={handleCreateGame} className="w-full" size="lg" disabled={!activeAccount || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Game...
              </>
            ) : (
              "Create New Game"
            )}
          </Button>
          <div className="flex items-center justify-center w-full">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Play with friends online</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
