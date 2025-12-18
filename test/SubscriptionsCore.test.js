const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionCore (Multi-Role Test)", function () {

  async function deployWithRolesFixture() {
    const [deployer, merchant, buyer] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.connect(deployer).deploy();
    const SubscriptionCore = await ethers.getContractFactory("SubscriptionCore");
    const core = await SubscriptionCore.connect(deployer).deploy();

    await token.connect(deployer).transfer(buyer.address, ethers.parseUnits("1000", 18));

    await token.connect(buyer).approve(core.target, ethers.MaxUint256);

    return { core, token, deployer, merchant, buyer };
  }

  describe("Role-based logic", function () {

    it("Check initial balances", async function () {
      const { token, deployer, merchant, buyer } = await loadFixture(deployWithRolesFixture);

      expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseUnits("1000", 18));
      expect(await token.balanceOf(merchant.address)).to.equal(0);
    });

    it("Merchant creates a plan", async function () {
      const { core, token, merchant } = await loadFixture(deployWithRolesFixture);

      const amount = ethers.parseUnits("100", 18);
      const frequency = 60;

      await expect(core.connect(merchant).createPlan(token.target, amount, frequency))
        .to.emit(core, "PlanCreated")
        .withArgs(0, merchant.address, amount);
    });

    it("Buyer subscribes and Merchant receives funds", async function () {
      const { core, token, merchant, buyer } = await loadFixture(deployWithRolesFixture);

      await core.connect(merchant).createPlan(token.target, ethers.parseUnits("100", 18), 60);

      const buyerBalBefore = await token.balanceOf(buyer.address);
      const merchBalBefore = await token.balanceOf(merchant.address);

      await expect(core.connect(buyer).subscribe(0))
        .to.emit(core, "Subscribed")
        .withArgs(0, buyer.address, 0);

      expect(await token.balanceOf(buyer.address)).to.equal(buyerBalBefore - ethers.parseUnits("100", 18));

      expect(await token.balanceOf(merchant.address)).to.equal(merchBalBefore + ethers.parseUnits("100", 18));
    });

    it("Only Buyer can cancel their subscription", async function () {
      const { core, token, merchant, buyer, deployer } = await loadFixture(deployWithRolesFixture);

      await core.connect(merchant).createPlan(token.target, 100, 60);
      await core.connect(buyer).subscribe(0); // sub id == 0

      await expect(core.connect(merchant).cancel(0))
        .to.be.revertedWithCustomError(core, "NotSubscriber");

      await expect(core.connect(deployer).cancel(0))
        .to.be.revertedWithCustomError(core, "NotSubscriber");

      await expect(core.connect(buyer).cancel(0))
        .to.emit(core, "Canceled")
        .withArgs(0);
    });

    it("Recurring Charge flows correctly from Buyer to Merchant", async function () {
      const { core, token, merchant, buyer, deployer } = await loadFixture(deployWithRolesFixture);

      await core.connect(merchant).createPlan(token.target, ethers.parseUnits("100", 18), 60);
      await core.connect(buyer).subscribe(0);

      await time.increase(61);

      const merchBalBefore = await token.balanceOf(merchant.address);

      await core.connect(deployer).charge(0); // sub id == 0

      expect(await token.balanceOf(merchant.address)).to.equal(merchBalBefore + ethers.parseUnits("100", 18));
    });

  });
});