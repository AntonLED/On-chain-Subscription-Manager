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
  console.log("MockToken contract deployed\n");

  const SubscriptionCore = await hre.ethers.getContractFactory("SubscriptionCore");
  const core = await SubscriptionCore.connect(deployer).deploy();
  await core.waitForDeployment();
  const coreAddress = await core.getAddress();
  console.log("SubscriptionCore contract deployed\n");

  const amountToBuyer = hre.ethers.parseUnits("5000", 18);
  
  await token.connect(deployer).transfer(buyer.address, amountToBuyer);

  console.log(`Deplyer --> Buyer (${hre.ethers.formatUnits(amountToBuyer, 18)} tokens)`);
  console.log(`Byer balance: ${hre.ethers.formatUnits(await token.balanceOf(buyer.address), 18)} USDT\n`);
  
  const planPrice = hre.ethers.parseUnits("100", 18);
  const planFreq = 60; 
  
  await core.connect(merchant).createPlan(tokenAddress, planPrice, planFreq);

  console.log("Merchant creates a subscription plan:");
  console.log(`Price: ${hre.ethers.formatUnits(planPrice, 18)} tokerns`);
  console.log(`Frequency: ${planFreq} sec`);
  console.log(`Merchant addr: ${merchant.address}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});