"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Coins } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@txnlab/use-wallet-react"

interface DepositFundsProps {
  onDeposit: (amount: number) => void
}

export function DepositFunds({ onDeposit }: DepositFundsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const { activeAccount } = useWallet()

  // Fixed amount of 5 ALGOS
  const depositAmount = 5

  const handleDeposit = () => {
    if (!activeAccount) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to deposit funds.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false)

      toast({
        title: "Deposit successful!",
        description: `${depositAmount} ALGOS has been added to your account.`,
      })

      onDeposit(depositAmount)
    }, 1500)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Deposit Funds
        </CardTitle>
        <CardDescription>Add funds to your account to start playing</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-primary/10 p-6 rounded-lg flex flex-col items-center justify-center">
          <div className="text-4xl font-bold text-primary mb-2">{depositAmount} ALGOS</div>
          <div className="text-sm text-muted-foreground">Fixed deposit amount</div>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm">Your Balance</span>
          <span className="font-bold">0 ALGOS</span>
        </div>

        {!activeAccount && (
          <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-lg text-sm">
            Please connect your wallet before depositing funds.
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={handleDeposit} className="w-full" size="lg" disabled={isProcessing || !activeAccount}>
          {isProcessing ? (
            <>
              <motion.div
                className="mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Coins className="h-4 w-4" />
              </motion.div>
              Processing...
            </>
          ) : (
            <>Deposit {depositAmount} ALGOS</>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
