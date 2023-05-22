import fs from "fs/promises";
import { ethers } from "hardhat";

import { BankAccount } from "../typechain-types";

async function deployBankAccount() {
  const BankAccount = await ethers.getContractFactory("BankAccount");
  const bankAccount = await BankAccount.deploy();

  await bankAccount.deployed();
  writeDeploymentInfo(bankAccount);
}

async function writeDeploymentInfo(contract: BankAccount) {
  const signerAddress = await contract.signer.getAddress();
  const data = {
    contract: {
      address: contract.address,
      signerAddress,
      abi: contract.interface.format(),
    },
  };

  const content = JSON.stringify(data, null, 2);
  await fs.writeFile("deployment.json", content, { encoding: "utf-8" });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployBankAccount().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
