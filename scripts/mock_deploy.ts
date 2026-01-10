import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

console.log(`Deploying Counter to ${networkName}...`);

const counter = await ethers.deployContract("MockContract");

console.log("Waiting for the deployment tx to confirm");
await counter.waitForDeployment();

console.log("Counter address:", await counter.getAddress());

console.log("Calling counter.incBy(5)");
const tx = await counter.incBy(5n);

console.log("Waiting for the counter.incBy(5) tx to confirm");
await tx.wait();

console.log("Deployment successful!");
