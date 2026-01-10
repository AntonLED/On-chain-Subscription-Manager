import { network } from "hardhat";

const { ethers, networkName } = await network.connect();

const [deployer, merchant, subscriber] = await ethers.getSigners();

console.log(deployer.getAddress());
console.log(merchant.getAddress());
console.log(subscriber.getAddress());
