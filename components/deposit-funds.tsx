"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Coins, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@txnlab/use-wallet-react"
import algosdk from "algosdk"
import { getGameByAppId } from "@/lib/supabase"

interface DepositFundsProps {
  onDeposit: (amount: number) => void
  gameId: number
}

export function DepositFunds({ onDeposit, gameId }: DepositFundsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [txId, setTxId] = useState<string | null>(null)
  const [gameAddress, setGameAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { activeAccount, transactionSigner } = useWallet()

  // Fixed amount of 5 ALGOS
  const depositAmount = 5
  // Convert to microAlgos (1 ALGO = 1,000,000 microAlgos)
  const microAlgos = depositAmount * 1000000

  // Set up Algorand client
  const algodClient = new algosdk.Algodv2(
    "", // No token needed for PureStake
    "https://testnet-api.algonode.cloud",
    "",
  )

  // Fetch game address from Supabase
  useEffect(() => {
    async function fetchGameAddress() {
      try {
        setIsLoading(true)
        const game = await getGameByAppId(gameId)

        if (game && game.app_address) {
          setGameAddress(game.app_address)
        } else {
          toast({
            title: "Game not found",
            description: "Could not find the game information.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching game address:", error)
        toast({
          title: "Error",
          description: "Failed to load game information.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchGameAddress()
  }, [gameId, toast])

  const handleDeposit = async () => {
    if (!activeAccount || !transactionSigner) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to deposit funds.",
        variant: "destructive",
      })
      return
    }

    if (!gameAddress) {
      toast({
        title: "Game address not found",
        description: "Could not find the game address for deposit.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)
      setTransactionStatus("processing")

      // Get suggested transaction parameters
      const suggestedParams = await algodClient.getTransactionParams().do()

      // Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAccount.address,
        receiver: gameAddress,
        amount: microAlgos,
        suggestedParams,
        note: new Uint8Array(Buffer.from(`Rock Paper Scissors Game Deposit`)),
      })

      // Sign the transaction
      const signedTxns = await transactionSigner([txn ], [0])

      // Send the transaction
      const { txid } = await algodClient.sendRawTransaction(signedTxns).do()
      setTxId(txid)

      // Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, txid, 4)

      // Update status and notify user
      setTransactionStatus("success")
      toast({
        title: "Deposit successful!",
        description: `${depositAmount} ALGOS has been added to your account.`,
      })

      // Wait a moment before proceeding
      setTimeout(() => {
        onDeposit(depositAmount)
      }, 2000)
    } catch (error) {
      console.error("Transaction error:", error)
      setTransactionStatus("error")
      toast({
        title: "Transaction failed",
        description: error instanceof Error ? error.message : "Failed to process your deposit.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Loading Game Information</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            <Loader2 className="h-8 w-8 text-primary" />
          </motion.div>
        </CardContent>
      </Card>
    )
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
          <span className="font-bold">
            {activeAccount ? `${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}` : "0 ALGOS"}
          </span>
        </div>

        {gameAddress && (
          <div className="bg-muted/50 p-3 rounded-lg flex flex-col gap-1">
            <span className="text-sm font-medium">Game Address</span>
            <span className="text-xs break-all">{gameAddress}</span>
          </div>
        )}

        {!activeAccount && (
          <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Please connect your wallet before depositing funds.</span>
          </div>
        )}

        {transactionStatus === "success" && (
          <div className="bg-green-500/10 text-green-500 p-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <div>
              <p>Transaction successful!</p>
              {txId && (
                <a
                  href={`https://testnet.algoexplorer.io/tx/${txId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-xs"
                >
                  View on AlgoExplorer
                </a>
              )}
            </div>
          </div>
        )}

        {transactionStatus === "error" && (
          <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Transaction failed. Please try again.</span>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleDeposit}
          className="w-full"
          size="lg"
          disabled={isProcessing || !activeAccount || transactionStatus === "success" || !gameAddress}
        >
          {isProcessing ? (
            <>
              <motion.div
                className="mr-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Coins className="h-4 w-4" />
              </motion.div>
              Processing Transaction...
            </>
          ) : transactionStatus === "success" ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Deposit Successful
            </>
          ) : (
            <>Deposit {depositAmount} ALGOS</>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
