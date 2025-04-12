# Rock-Paper-Scissors


# 🪨📄✂️ Algo Rock-Paper-Scissors

A decentralized, trustless Rock-Paper-Scissors game built with ****Next.js**** and powered by **Algorand smart contracts** **.** **This project leverages the **[TealScript](https://github.com/algorandfoundation/tealscript)** framework to manage game logic on-chain, ensuring fairness and transparency.**

## 🚀 Live Demo

[Check Out The Live Website](https://rps.nickthelegend.tech/)

## 🧠 Smart Contract Overview

**The core game logic is encapsulated within the **`Game`** smart contract, written using TealScript.** **This contract manages player interactions, move submissions, fund handling, and determines the game outcome.**

```ts
import { Contract } from '@algorandfoundation/tealscript';


export class Game extends Contract {


    player1 = GlobalStateKey<Address>();
  
    player2 = GlobalStateKey<Address>();
    depositedAmount = GlobalStateKey<uint64>();
    maxDepositAmount = GlobalStateKey<uint64>();
    winner = GlobalStateKey<Address>();
    player1Move = BoxKey<string>({key:'player1Move',dynamicSize: true});
    player2Move = BoxKey<string>({key:'player2Move',dynamicSize: true});
    player1Chances = GlobalStateKey<uint64>();
    player2Chances = GlobalStateKey<uint64>();

    status = GlobalStateKey<string>(); // Possible values: 'Active', 'Expired'

    createApplication(): void {

      
        this.depositedAmount.value = 0;
        this.maxDepositAmount.value = 5;


      }
      createBox(): void {
        this.player1Move.create(45)
        this.player2Move.create(45)

      }

      depositfundsPlayer1(ftransx : PayTxn){
        assert(
          !this.player1.exists
        );

          verifyPayTxn(ftransx, {
            receiver: this.app.address,
            });
        this.depositedAmount.value += ftransx.amount;
        this.player1.value=this.txn.sender;

      }

      depositfundsPlayer2(ftransx : PayTxn){
        assert(
          !this.player2.exists
        );

          verifyPayTxn(ftransx, {
            receiver: this.app.address,
            });
        this.depositedAmount.value += ftransx.amount;
            this.player2.value=this.txn.sender;
      }
      sendFunds (player: Address){

        assert(
            this.txn.sender === this.app.creator
          );
          sendPayment({
            receiver: player,
            amount: 9000000,
          });
          this.depositedAmount.value = 0;



      }


      joinGame (player: Address){
        assert(
            !this.player2.exists
          );

          this.player2.value =player;

      }

      player1turn (move : string){


        assert(this.txn.sender == this.player1.value );

        this.player1Move.value = move;
        this.player1Chances.value+=1;


      }
      player2turn (move : string){


        assert(this.txn.sender == this.player2.value );

        this.player2Move.value = move;
        this.player2Chances.value+=1;


      }



      setWinner (winner : Address){

        assert(this.txn.sender == this.app.creator);

        this.winner.value = winner


      }

}
```

### Key Components

* **Global State Variables:**
  * `player1` & `player2`: **Addresses of the participating players.**
  * `depositedAmount`: **Total funds deposited into the contract.**
  * `maxDepositAmount`: **Maximum allowable deposit.**
  * `winner`: **Address of the winning player.**
  * `player1Chances` & `player2Chances`: **Number of moves made by each player.**
  * `status`: **Current status of the game (**`Active` or **`Expired`**).
* **Box Storage:**
  * `player1Move` & `player2Move`: **Encrypted storage of each player's move to ensure secrecy until both moves are submitted.**

### Core Functions

* `createApplication()`: **Initializes the contract with default values.**
* `createBox()`: **Sets up storage boxes for player moves.**
* `depositfundsPlayer1(ftransx: PayTxn)`: **Allows Player 1 to deposit funds into the contract.**
* `depositfundsPlayer2(ftransx: PayTxn)`: **Allows Player 2 to deposit funds into the contract.**
* `sendFunds(player: Address)`: **Transfers the winning amount to the specified player.**
* `joinGame(player: Address)`: **Registers a second player into the game.
* `player1turn(move: string)`: **Records Player 1's move.**
* `player2turn(move: string)`: **Records Player 2's move.**
* `setWinner(winner: Address)`: **Determines and records the winner of the game.**

## ⚙️ How It Works

1. **Game Initialization:**
   * **The smart contract is deployed with initial parameters, setting up the game environment.**
2. **Player Registration & Fund Deposit:**
   * **Player 1 initiates the game by depositing funds.**
   * **Player 2 joins by also depositing the required amount.**
3. **Move Submission:**
   * **Each player submits their move (**`rock`**, **`paper`**, or **`scissors`**) encrypted and stored in the contract's box storage.**
4. **Determining the Winner:**
   * **Once both moves are submitted, the contract logic determines the winner based on standard game rules.**
5. **Fund Distribution:**
   * **The contract transfers the total deposited amount to the winner's address.**
6. **Game Reset:**
   * **The contract resets the game state, allowing for a new game to commence.**


## 🛠️ Tech Stack

* **Frontend:** **Next.js, Tailwind CSS**
* **Blockchain:** **Algorand Smart Contracts via TealScript**
* **Wallet Integration:** **Algorand Wallet Connect**
* **Deployment:** **Vercel**



## TODO

* [X] Connect wallet
* [X] Contract deposit
* [X] Database storage of AppID and AppAddress
* [X] Listening to the player's Moves
* [X] once a player move is done it is recorded into the smart contracts's box , i should implement the storage of the move and the move should be encrypted also so that the other player shouldnt know the move
* [X] Encrypt the moves while sending
