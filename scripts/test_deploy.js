const hre = require("hardhat");

async function main() {
  const [deployer, merchant, buyer] = await hre.ethers.getSigners();

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Merchant: ${merchant.address}`);
  console.log(`Buyer: ${buyer.address}\n`);

  const MockToken = await hre.ethers.getContractFactory("MockToken");
  const token = await MockToken.connect(deployer).deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("MockToken contract deployed at ", tokenAddress);

  const SubscriptionCore = await hre.ethers.getContractFactory("SubscriptionCore");
  const core = await SubscriptionCore.connect(deployer).deploy();
  await core.waitForDeployment();
  const coreAddress = await core.getAddress();
  console.log("SubscriptionCore contract deployed at ", coreAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});