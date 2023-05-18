import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
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
      await expect(
        BankAccountContract.connect(user2).deposit(1, {
          value: ethers.utils.parseEther("1"),
        })
      ).to.be.revertedWith(
        "Only account owners can make a deposit to this account"
      );
    });

    it("Deposit to an account successfully", async () => {
      const { BankAccountContract, user1 } = await loadFixture(
        deploymentFixture
      );
      await loadFixture(
        createAccountFixture(BankAccountContract, [user1.address])
      );
      expect(await BankAccountContract.getAccountBalance(1)).to.equal(0);
      const amount = ethers.utils.parseEther("1");
      await BankAccountContract.deposit(1, {
        value: amount,
      });
      expect(await BankAccountContract.getAccountBalance(1)).to.equal(amount);
    });
  });
});
