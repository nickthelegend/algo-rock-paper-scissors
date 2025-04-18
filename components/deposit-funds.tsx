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
import { fetchApplicationState, hasPlayerDeposited, PLAYER1_KEY, PLAYER2_KEY } from "@/lib/algorand"

interface DepositFundsProps {
  onDeposit: (amount: number) => void
  gameId: number
  isPlayer1: boolean
  player1Address: string | null
}

export function DepositFunds({ onDeposit, gameId, isPlayer1, player1Address }: DepositFundsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success" | "error">("idle")
  const [txId, setTxId] = useState<string | null>(null)
  const [gameAddress, setGameAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [appState, setAppState] = useState<any>(null)
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

  // Fetch game address and application state
  useEffect(() => {
    async function fetchGameInfo() {
      try {
        setIsLoading(true)

        // Fetch game info from Supabase
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

        // Fetch application state from Algorand
        const state = await fetchApplicationState(gameId)
        setAppState(state)

        // Check if player has already deposited
        const player1Deposited = hasPlayerDeposited(state, PLAYER1_KEY)
        const player2Deposited = hasPlayerDeposited(state, PLAYER2_KEY)

        if (isPlayer1 && player1Deposited) {
          // Player 1 has already deposited
          onDeposit(depositAmount)
        } else if (!isPlayer1 && player2Deposited) {
          // Player 2 has already deposited
          onDeposit(depositAmount)
        }
      } catch (error) {
        console.error("Error fetching game info:", error)
        toast({
          title: "Error",
          description: "Failed to load game information.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchGameInfo()

    // Set up polling to check for deposits every 3 seconds
    const intervalId = setInterval(async () => {
      try {
        // Don't set loading state during polling
        // Fetch application state from Algorand
        const state = await fetchApplicationState(gameId)

        // Check if player has already deposited
        const player1Deposited = hasPlayerDeposited(state, PLAYER1_KEY)
        const player2Deposited = hasPlayerDeposited(state, PLAYER2_KEY)

        if (isPlayer1 && player1Deposited) {
          // Player 1 has already deposited
          onDeposit(depositAmount)
          clearInterval(intervalId) // Stop polling once deposit is detected
        } else if (!isPlayer1 && player2Deposited) {
          // Player 2 has already deposited
          onDeposit(depositAmount)
          clearInterval(intervalId) // Stop polling once deposit is detected
        }
      } catch (error) {
        console.error("Error polling for deposits:", error)
      }
    }, 3000)

    // Clean up interval on unmount
    return () => clearInterval(intervalId)
  }, [gameId, toast, onDeposit, isPlayer1, depositAmount])

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
      const atc = new algosdk.AtomicTransactionComposer()

      // Create payment transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: activeAccount.address,
        receiver: gameAddress,
        amount: microAlgos,
        suggestedParams,
        note: new Uint8Array(Buffer.from(`Rock Paper Scissors Game Deposit`)),
      })

      const assetTransferTxnWithSigner = {
        txn: txn,
        signer: transactionSigner,
      }

      // Check if the active account is player1 or player2
      const currentIsPlayer1 = player1Address && activeAccount.address === player1Address

      // Call the appropriate method based on player identity
      if (currentIsPlayer1) {
        atc.addMethodCall({
          appID: gameId,
          method: new algosdk.ABIMethod({
            name: "depositfundsPlayer1",
            desc: "",
            args: [{ type: "pay", name: "ftransx", desc: "" }],
            returns: { type: "void", desc: "" },
          }),
          signer: transactionSigner,
          methodArgs: [assetTransferTxnWithSigner],
          sender: activeAccount.address,
          suggestedParams: { ...suggestedParams, fee: Number(30) },
        })
      } else {
        atc.addMethodCall({
          appID: gameId,
          method: new algosdk.ABIMethod({
            name: "depositfundsPlayer2",
            desc: "",
            args: [{ type: "pay", name: "ftransx", desc: "" }],
            returns: { type: "void", desc: "" },
          }),
          signer: transactionSigner,
          methodArgs: [assetTransferTxnWithSigner],
          sender: activeAccount.address,
          suggestedParams: { ...suggestedParams, fee: Number(30) },
        })
      }

      // Execute the transaction
      const result = await atc.execute(algodClient, 4)

      // Get transaction ID from the result
      for (const mr of result.methodResults) {
        console.log(`${mr.returnValue}`)
        setTxId(mr.txID)
      }

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

  // Determine if the active account is player1 or player2
  const playerRole = isPlayer1 ? "Player 1" : "Player 2"

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Deposit Funds
        </CardTitle>
        <CardDescription>
          {isPlayer1
            ? "Player 1 needs to deposit funds to start the game"
            : "Player 2 needs to deposit funds to join the game"}
        </CardDescription>
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

        <div className="bg-blue-500/10 text-blue-500 p-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>You are joining as {playerRole}</span>
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
