"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { ConnectWallet } from "@/components/connect-wallet"
import { Users, Wallet } from "lucide-react"
import Image from "next/image"
import { DepositFunds } from "@/components/deposit-funds"
import { useRouter } from "next/navigation"

export default function Home() {
  const [hasDeposited, setHasDeposited] = useState(false)
  const [balance, setBalance] = useState(0)
  const router = useRouter()

  const handleDeposit = (amount: number) => {
    setBalance(amount)
    setHasDeposited(true)
  }

  const handleCreateGame = async () => {
    // Simulate the server action
    const gameId = Math.floor(100000000 + Math.random() * 900000000).toString()
    router.push(`/game/${gameId}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        {hasDeposited && (
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
            <Wallet className="h-4 w-4" />
            <span className="font-medium">{balance} ALGOS</span>
          </div>
        )}
        <ConnectWallet />
        <ThemeToggle />
      </div>

      {!hasDeposited ? (
        <DepositFunds onDeposit={handleDeposit} />
      ) : (
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button onClick={handleCreateGame} className="w-full" size="lg">
              Create New Game
            </Button>
            <div className="flex items-center justify-center w-full">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Play with friends online</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
