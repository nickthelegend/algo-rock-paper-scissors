"use client"

import { useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { Button } from "@/components/ui/button"
import { Wallet } from 'lucide-react'
import ConnectWalletModal from "./connect-wallet-modal"

export function ConnectWallet() {
  const { wallets, activeAccount } = useWallet()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
        onClick={openModal}
      >
        <Wallet className="h-4 w-4" />
        {activeAccount ? (
          <span>
            {activeAccount.address.slice(0, 4)}...{activeAccount.address.slice(-4)}
          </span>
        ) : (
          <span>Connect</span>
        )}
      </Button>
      <ConnectWalletModal wallets={wallets} isOpen={isModalOpen} onClose={closeModal} />
    </>
  )
}
