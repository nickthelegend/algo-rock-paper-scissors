"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, Coins, CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from "@txnlab/use-wallet-react"
import algosdk from "algosdk"

interface DepositFundsProps {
  onDeposit: (amount: number) => void
}

export function DepositFunds({ onDeposit }: DepositFundsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [txId, setTxId] = useState<string | null>(null)
  const { toast } = useToast()
  const { activeAccount, transactionSigner } = useWallet()

  // Fixed amount of 5 ALGOS
  const depositAmount = 5
  // Convert to microAlgos (1 ALGO = 1,000,000 microAlgos)
  const microAlgos = depositAmount * 1000000

  // Game treasury address
  const GAME_TREASURY_ADDRESS = "TMKUUBK53QQQ5JTFJPY5QO6DBOXT7HICKX2HZ4MIH7MRAYVJIUIO7X2XWE"
  // Set up Algorand client
  const algodClient = new algosdk.Algodv2(
    "", // No token needed for PureStake
    "https://testnet-api.algonode.cloud",
    "",
  )

  const handleDeposit = async () => {
    if (!activeAccount || !transactionSigner) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to deposit funds.",
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
        receiver: GAME_TREASURY_ADDRESS,
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
          disabled={isProcessing || !activeAccount || transactionStatus === "success"}
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
