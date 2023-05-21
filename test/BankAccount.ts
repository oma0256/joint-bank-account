import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { ContractTransaction, BigNumber } from "ethers";
import { BankAccount } from "../typechain-types";

describe("Test BankAccount Contract", () => {
  const deploymentFixture = async () => {
    const [owner, user1, user2, user3, user4] = await ethers.getSigners();
    const BankAccountContractFactory = await ethers.getContractFactory(
      "BankAccount"
    );
    const BankAccountContract = await BankAccountContractFactory.deploy();
    await BankAccountContract.deployed();

    return { BankAccountContract, owner, user1, user2, user3, user4 };
  };

  const createAccountFixture = (
    BankAccountContract: BankAccount,
    otherOwners: string[]
  ) => {
    const _createAccountFixture = async () => {
      await BankAccountContract.createAccount(otherOwners);
    };
    return _createAccountFixture;
  };

  const depositFixture = (
    BankAccountContract: BankAccount,
    accountId: number,
    amount: BigNumber
  ) => {
    const _deposit = async () => {
      await BankAccountContract.deposit(accountId, { value: amount });
    };
    return _deposit;
  };

  const requestWithdrawalFixture = (
    BankAccountContract: BankAccount,
    accountId: number,
    amount: BigNumber
  ) => {
    const _requestWithdrawal = async () => {
      await BankAccountContract.requestWithdrawal(accountId, amount);
    };
    return _requestWithdrawal;
  };

  const getLatestTransactionEvent = async (
    transaction: ContractTransaction,
    BankAccountContract: BankAccount
  ) => {
    const contractReceipt = await transaction.wait();
    const transactionHash = contractReceipt.transactionHash;
    const receipt = await BankAccountContract.provider.getTransactionReceipt(
      transactionHash
    );
    return BankAccountContract.interface.parseLog(receipt.logs[0]);
  };

  describe("Test Contract Deployment", () => {
    it("Deploying contract.", async () => {
      await ethers.getSigners();
      const BankAccountContractFactory = await ethers.getContractFactory(
        "BankAccount"
      );
      const BankAccountContract = await BankAccountContractFactory.deploy();
      await BankAccountContract.deployed();
    });
  });

  describe("Test Create Account", () => {
    it("Creating an account.", async () => {
      const { BankAccountContract, user1 } = await loadFixture(
        deploymentFixture
      );

      expect(await BankAccountContract.getUserAccountsCount()).to.equal(0);
      await BankAccountContract.createAccount([]);
      expect(await BankAccountContract.getUserAccountsCount()).to.equal(1);

      await BankAccountContract.createAccount([user1.address]);
      expect(await BankAccountContract.getUserAccountsCount()).to.equal(2);
      expect(
        await BankAccountContract.connect(user1).getUserAccountsCount()
      ).to.equal(1);
    });

    it("Unable to create account with more than 4 owners.", async () => {
      const { BankAccountContract, user1, user2, user3, user4 } =
        await loadFixture(deploymentFixture);

      await expect(
        BankAccountContract.createAccount([
          user1.address,
          user2.address,
          user3.address,
          user4.address,
        ])
      ).to.be.revertedWith("An account can't have more than 4 owners.");
      expect(await BankAccountContract.getUserAccountsCount()).to.equal(0);
    });

    it("A user can't own more than 3 accounts.", async () => {
      const { BankAccountContract, user1, user2, user3, user4 } =
        await loadFixture(deploymentFixture);

      await BankAccountContract.createAccount([user1.address]);
      await BankAccountContract.connect(user1).createAccount([user2.address]);
      await BankAccountContract.connect(user1).createAccount([
        user3.address,
        user4.address,
      ]);
      expect(
        await BankAccountContract.connect(user1).getUserAccountsCount()
      ).to.equal(3);
      await expect(
        BankAccountContract.createAccount([
          user1.address,
          user2.address,
          user3.address,
        ])
      ).to.be.revertedWith(
        "One of the account owners your trying to add already owns 3 accounts."
      );
      await expect(
        BankAccountContract.connect(user1).createAccount([
          user2.address,
          user3.address,
        ])
      ).to.be.revertedWith("You can't own more than 3 accounts.");
      expect(
        await BankAccountContract.connect(user1).getUserAccountsCount()
      ).to.equal(3);
    });

    it("Can't add owner's address to addresses when creating an account.", async () => {
      const { BankAccountContract, owner } = await loadFixture(
        deploymentFixture
      );
      await expect(
        BankAccountContract.createAccount([owner.address])
      ).to.be.revertedWith(
        "You account will be automatically added to the account owners."
      );
      expect(await BankAccountContract.getUserAccountsCount()).to.equal(0);
    });

    it("Can't create contract with duplicate address.", async () => {
      const { BankAccountContract, user1 } = await loadFixture(
        deploymentFixture
      );
      await expect(
        BankAccountContract.createAccount([user1.address, user1.address])
      ).to.be.revertedWith(
        "Can't create an account with duplicate owners entry."
      );
      expect(await BankAccountContract.getUserAccountsCount()).to.equal(0);
    });
  });

  describe("Test deposit", () => {
    it("Only account owners can deposit to the account", async () => {
      const { BankAccountContract, user1, user2 } = await loadFixture(
        deploymentFixture
      );
      await loadFixture(
        createAccountFixture(BankAccountContract, [user1.address])
      );
      expect(await BankAccountContract.getAccountBalance(1)).to.equal(0);
      await expect(
        BankAccountContract.connect(user2).deposit(1, {
          value: ethers.utils.parseEther("1"),
        })
      ).to.be.revertedWith("Only account owners can perform this action.");
      expect(await BankAccountContract.getAccountBalance(1)).to.equal(0);
    });

    it("Deposit to an account successfully", async () => {
      const { BankAccountContract, owner, user1 } = await loadFixture(
        deploymentFixture
      );
      await loadFixture(
        createAccountFixture(BankAccountContract, [user1.address])
      );
      expect(await BankAccountContract.getAccountBalance(1)).to.equal(0);
      const amount = ethers.utils.parseEther("1");
      const transaction = await BankAccountContract.deposit(1, {
        value: amount,
      });
      expect(await BankAccountContract.getAccountBalance(1)).to.equal(amount);
      const event = await getLatestTransactionEvent(
        transaction,
        BankAccountContract
      );
      expect(event.name).to.equal("Deposit");
      expect(event.args.user).to.equal(owner.address);
      expect(event.args.accountId).to.equal(1);
      expect(event.args.value).to.equal(amount);
    });

    describe("Test requesting withdraw", () => {
      it("Only account owners can request for a withdraw from an account", async () => {
        const { BankAccountContract, user1, user2 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await expect(
          BankAccountContract.connect(user2).requestWithdrawal(1, 1)
        ).to.be.revertedWith("Only account owners can perform this action.");
      });

      it("Can't request withdraw for amount less than 1", async () => {
        const { BankAccountContract, user1 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await expect(
          BankAccountContract.requestWithdrawal(1, 0)
        ).to.be.revertedWith(
          "Amount requesting for withdraw must be greater than 0."
        );
      });

      it("Account has insufficient balance", async () => {
        const { BankAccountContract, user1 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await loadFixture(
          depositFixture(BankAccountContract, 1, ethers.utils.parseEther("1"))
        );
        await expect(
          BankAccountContract.requestWithdrawal(1, ethers.utils.parseEther("2"))
        ).to.be.revertedWith("Insufficient balance.");
      });

      it("Withdrawal request successfully", async () => {
        const { BankAccountContract, owner, user1 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await loadFixture(
          depositFixture(BankAccountContract, 1, ethers.utils.parseEther("1"))
        );
        const transaction = await BankAccountContract.requestWithdrawal(
          1,
          ethers.utils.parseEther("1")
        );
        const event = await getLatestTransactionEvent(
          transaction,
          BankAccountContract
        );
        expect(event.name).to.equal("WithdrawalRequest");
        expect(event.args.user).to.equal(owner.address);
        expect(event.args.accountId).to.equal(1);
        expect(event.args.withdrawRequestId).to.equal(1);
        expect(event.args.amount).to.equal(ethers.utils.parseEther("1"));
      });
    });

    describe("Test approve withdraw", () => {
      it("Only account owners can approve a withdrawal request", async () => {
        const { BankAccountContract, user1, user2 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await loadFixture(
          depositFixture(BankAccountContract, 1, ethers.utils.parseEther("1"))
        );
        await loadFixture(
          requestWithdrawalFixture(
            BankAccountContract,
            1,
            ethers.utils.parseEther("1")
          )
        );
        await expect(
          BankAccountContract.connect(user2).approveWithdrawal(1, 1)
        ).to.be.revertedWith("Only account owners can perform this action.");
      });

      it("You can't approve your own withdraw request.", async () => {
        const { BankAccountContract, user1 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await loadFixture(
          depositFixture(BankAccountContract, 1, ethers.utils.parseEther("1"))
        );
        await loadFixture(
          requestWithdrawalFixture(
            BankAccountContract,
            1,
            ethers.utils.parseEther("1")
          )
        );
        await expect(
          BankAccountContract.approveWithdrawal(1, 1)
        ).to.be.revertedWith("You can't approve your own withdraw request.");
      });

      it("Account owner can only approve a withdrawal request once.", async () => {
        const { BankAccountContract, user1, user2 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [
            user1.address,
            user2.address,
          ])
        );
        await loadFixture(
          depositFixture(BankAccountContract, 1, ethers.utils.parseEther("1"))
        );
        await loadFixture(
          requestWithdrawalFixture(
            BankAccountContract,
            1,
            ethers.utils.parseEther("1")
          )
        );
        const transaction1 = await BankAccountContract.connect(
          user1
        ).approveWithdrawal(1, 1);
        const event1 = await getLatestTransactionEvent(
          transaction1,
          BankAccountContract
        );
        expect(event1.name).to.equal("RequestApproval");
        expect(event1.args.user).to.equal(user1.address);
        expect(event1.args.accountId).to.equal(1);
        expect(event1.args.withdrawRequestId).to.equal(1);
        expect(event1.args.isApproved).to.equal(false);

        await expect(
          BankAccountContract.connect(user1).approveWithdrawal(1, 1)
        ).to.be.revertedWith("You already approved this withdraw request.");

        const transaction2 = await BankAccountContract.connect(
          user2
        ).approveWithdrawal(1, 1);
        const event2 = await getLatestTransactionEvent(
          transaction2,
          BankAccountContract
        );
        expect(event2.name).to.equal("RequestApproval");
        expect(event2.args.user).to.equal(user2.address);
        expect(event2.args.accountId).to.equal(1);
        expect(event2.args.withdrawRequestId).to.equal(1);
        expect(event2.args.isApproved).to.equal(true);
      });
    });

    describe("Test withdrawing funds", () => {
      it("Only account owner can withdraw funds.", async () => {
        const { BankAccountContract, user1, user2 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await expect(
          BankAccountContract.connect(user2).withdraw(1, 1)
        ).to.be.revertedWith("Only account owners can perform this action.");
      });

      it("Only the person that initiated the the request withdrawal can withdraw the funds.", async () => {
        const { BankAccountContract, user1 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await loadFixture(
          depositFixture(BankAccountContract, 1, ethers.utils.parseEther("1"))
        );
        await loadFixture(
          requestWithdrawalFixture(
            BankAccountContract,
            1,
            ethers.utils.parseEther("1")
          )
        );
        await BankAccountContract.connect(user1).approveWithdrawal(1, 1);
        await expect(
          BankAccountContract.connect(user1).withdraw(1, 1)
        ).to.be.revertedWith("You didn't initiate this withdrawal request.");
      });

      it("Can't withdraw from account with insufficient funds.", async () => {
        const { BankAccountContract, user1 } = await loadFixture(
          deploymentFixture
        );
        await loadFixture(
          createAccountFixture(BankAccountContract, [user1.address])
        );
        await loadFixture(
          depositFixture(BankAccountContract, 1, ethers.utils.parseEther("1"))
        );
        await loadFixture(
          requestWithdrawalFixture(
            BankAccountContract,
            1,
            ethers.utils.parseEther("1")
          )
        );
        await BankAccountContract.connect(user1).approveWithdrawal(1, 1);
        await loadFixture(
          requestWithdrawalFixture(
            BankAccountContract.connect(user1),
            1,
            ethers.utils.parseEther("1")
          )
        );
        await BankAccountContract.approveWithdrawal(1, 2);

        const transaction = await BankAccountContract.connect(user1).withdraw(
          1,
          2
        );
        const event = await getLatestTransactionEvent(
          transaction,
          BankAccountContract
        );
        expect(event.name).to.equal("Withdraw");
        expect(event.args.user).to.equal(user1.address);
        expect(event.args.accountId).to.equal(1);
        expect(event.args.withdrawRequestId).to.equal(2);
        expect(event.args.amount).to.equal(ethers.utils.parseEther("1"));

        await expect(BankAccountContract.withdraw(1, 1)).to.be.revertedWith(
          "Insufficient funds."
        );
      });
    });
  });
});
