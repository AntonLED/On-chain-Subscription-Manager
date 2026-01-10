import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

const [deployer, merchant, subscriber] = await ethers.getSigners();

console.log(`Deployer address: ${await deployer.getAddress()}`);
console.log(`Merchant address: ${await merchant.getAddress()}`);
console.log(`Subscriber address: ${await subscriber.getAddress()}`);

console.log(`Deploying SubscriptionsManagerCore to ${networkName}...`);

const MockTokenContract = await ethers.getContractFactory("MockToken");
const MockToken = await MockTokenContract.connect(deployer).deploy();
await MockToken.waitForDeployment();
console.log("MockToken address:", await MockToken.getAddress());

const SubscriptionsManagerCoreContract = await ethers.getContractFactory(
    "SubscriptionsManagerCore",
);
const SubscriptionsManagerCore =
    await SubscriptionsManagerCoreContract.connect(deployer).deploy();
await SubscriptionsManagerCore.waitForDeployment();
console.log(
    "SubscriptionsManagerCore address:",
    await SubscriptionsManagerCore.getAddress(),
);

console.log("Deployment successful");
