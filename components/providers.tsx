"use client"

import type React from "react"
import { NetworkId, WalletId, WalletManager, WalletProvider } from "@txnlab/use-wallet-react"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const walletManager = new WalletManager({
  wallets: [
    WalletId.DEFLY,
    WalletId.PERA,
    WalletId.EXODUS,
    {
      id: WalletId.LUTE,
      options: { siteName: "VehicleChain" },
    },
  ],
  defaultNetwork: NetworkId.TESTNET,
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider manager={walletManager}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </WalletProvider>
  )
}
