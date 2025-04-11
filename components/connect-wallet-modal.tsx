"use client"

import { type Wallet, useWallet } from "@txnlab/use-wallet-react"
import { toast } from "react-toastify"

const ConnectWalletModal = ({
  wallets,
  isOpen,
  onClose,
}: {
  wallets: Wallet[]
  isOpen: boolean
  onClose: () => void
}) => {
  const { activeAccount } = useWallet() // Moved useWallet hook to the top level

  if (!isOpen) return null

  const handleWalletClick = async (wallet: Wallet) => {
    try {
      if (wallet.isConnected) {
        await wallet.setActive()
        toast.success("Wallet set as active")
      } else {
        await wallet.connect()
        toast.success("Wallet connected successfully")
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Failed to connect wallet")
    }
  }

  const disconnectWallets = async () => {
    try {
      for (const wallet of wallets) {
        if (wallet.isConnected) {
          await wallet.disconnect()
        }
      }
      toast.success("Disconnected from all wallets")
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Failed to disconnect wallets")
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Connect to a wallet</h3>
          <button className="text-2xl hover:text-primary" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="space-y-2">
          {wallets.map((wallet) => (
            <div
              onClick={() => handleWalletClick(wallet)}
              key={wallet.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors ${
                wallet.activeAccount ? "border-primary" : "border-border"
              }`}
            >
              <span>
                {wallet.metadata.name}{" "}
                {wallet.activeAccount &&
                  `[${wallet.activeAccount.address.slice(0, 3)}...${wallet.activeAccount.address.slice(-3)}]`}
                {wallet.isActive && ` (active)`}
              </span>
              <img
                src={wallet.metadata.icon || "/placeholder.svg?height=24&width=24"}
                alt={`${wallet.metadata.name} Icon`}
                className="h-6 w-6"
              />
            </div>
          ))}
        </div>

        {activeAccount && (
          <div
            onClick={disconnectWallets}
            className="flex items-center justify-between p-3 mt-2 rounded-lg border border-destructive cursor-pointer hover:bg-destructive/10 transition-colors"
          >
            <span>
              Disconnect{" "}
              {activeAccount && `[${activeAccount.address.slice(0, 3)}...${activeAccount.address.slice(-3)}]`}
            </span>
          </div>
        )}

        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          <span>New to Algorand? </span>
          <a
            href="https://algorand.com/wallets"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Learn more about wallets
          </a>
        </div>
      </div>
    </div>
  )
}

export default ConnectWalletModal
