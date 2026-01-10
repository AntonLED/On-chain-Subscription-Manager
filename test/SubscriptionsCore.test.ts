import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

describe("Subscription System Multi-role Test", function () {
    async function deployWithRolesFixture() {
        const [deployer, merchant, subscriber] = await ethers.getSigners();

        const MockTokenContract = await ethers.getContractFactory("MockToken");
        const MockToken = await MockTokenContract.connect(deployer).deploy();
        await MockToken.waitForDeployment();

        const SubscriptionsManagerCoreContract =
            await ethers.getContractFactory("SubscriptionsManagerCore");
        const SubscriptionsManagerCore =
            await SubscriptionsManagerCoreContract.connect(deployer).deploy();
        await SubscriptionsManagerCore.waitForDeployment();

        await MockToken.connect(deployer).transfer(
            await subscriber.getAddress(),
            ethers.parseUnits("1000", 18),
        );
        await MockToken.connect(subscriber).approve(
            await SubscriptionsManagerCore.getAddress(),
            ethers.parseUnits("1000", 18),
        );

        return { MockToken, SubscriptionsManagerCore, merchant, subscriber };
    }

    describe("Role-based logic", function () {
        it("Check initial balances", async function () {
            const {
                MockToken,
                SubscriptionsManagerCore,
                merchant,
                subscriber,
            } = await networkHelpers.loadFixture(deployWithRolesFixture);

            expect(await MockToken.balanceOf(subscriber.address)).to.equal(
                ethers.parseUnits("1000", 18),
            );
            expect(await MockToken.balanceOf(merchant.address)).to.equal(0);
        });

        it("Merchant creates a plan", async function () {
            const {
                MockToken,
                SubscriptionsManagerCore,
                merchant,
                subscriber,
            } = await networkHelpers.loadFixture(deployWithRolesFixture);

            const amount = ethers.parseUnits("100", 18);
            const frequency = 60;

            await expect(
                SubscriptionsManagerCore.connect(merchant).createPlan(
                    await SubscriptionsManagerCore.getAddress(),
                    amount,
                    frequency,
                ),
            )
                .to.emit(SubscriptionsManagerCore, "PlanCreated")
                .withArgs(0, merchant.address, amount);
        });

        it("Buyer subscribes and Merchant receives funds", async function () {
            const {
                MockToken,
                SubscriptionsManagerCore,
                merchant,
                subscriber,
            } = await networkHelpers.loadFixture(deployWithRolesFixture);

            await SubscriptionsManagerCore.connect(merchant).createPlan(
                await MockToken.getAddress(),
                ethers.parseUnits("100", 18),
                60,
            );

            const buyerBalBefore = await MockToken.balanceOf(
                subscriber.address,
            );
            const merchBalBefore = await MockToken.balanceOf(merchant.address);

            await expect(
                SubscriptionsManagerCore.connect(subscriber).subscribe(0),
            )
                .to.emit(SubscriptionsManagerCore, "Subscribed")
                .withArgs(0, subscriber.address, 0);

            expect(await MockToken.balanceOf(subscriber.address)).to.equal(
                buyerBalBefore - ethers.parseUnits("100", 18),
            );

            expect(await MockToken.balanceOf(merchant.address)).to.equal(
                merchBalBefore + ethers.parseUnits("100", 18),
            );
        });

        it("Only Buyer can cancel their subscription", async function () {
            const {
                MockToken,
                SubscriptionsManagerCore,
                merchant,
                subscriber,
            } = await networkHelpers.loadFixture(deployWithRolesFixture);

            await SubscriptionsManagerCore.connect(merchant).createPlan(
                await MockToken.getAddress(),
                100,
                60,
            );
            await SubscriptionsManagerCore.connect(subscriber).subscribe(0);

            await expect(
                SubscriptionsManagerCore.connect(merchant).cancel(0),
            ).to.be.revertedWithCustomError(
                SubscriptionsManagerCore,
                "NotSubscriber",
            );

            await expect(SubscriptionsManagerCore.connect(subscriber).cancel(0))
                .to.emit(SubscriptionsManagerCore, "Canceled")
                .withArgs(0);
        });

        it("Recurring Charge flows correctly from Buyer to Merchant", async function () {
            const {
                MockToken,
                SubscriptionsManagerCore,
                merchant,
                subscriber,
            } = await networkHelpers.loadFixture(deployWithRolesFixture);

            await SubscriptionsManagerCore.connect(merchant).createPlan(
                await MockToken.getAddress(),
                ethers.parseUnits("100", 18),
                60,
            );
            await SubscriptionsManagerCore.connect(subscriber).subscribe(0);

            await networkHelpers.time.increase(61);

            const merchBalBefore = await MockToken.balanceOf(merchant.address);

            await SubscriptionsManagerCore.connect(merchant).charge(0);

            expect(await MockToken.balanceOf(merchant.address)).to.equal(
                merchBalBefore + ethers.parseUnits("100", 18),
            );
        });

        it("Recurring Charge flows incorrectly from Buyer to Merchant", async function () {
            const {
                MockToken,
                SubscriptionsManagerCore,
                merchant,
                subscriber,
            } = await networkHelpers.loadFixture(deployWithRolesFixture);

            await SubscriptionsManagerCore.connect(merchant).createPlan(
                await MockToken.getAddress(),
                ethers.parseUnits("100", 18),
                60,
            );
            await SubscriptionsManagerCore.connect(subscriber).subscribe(0);

            await networkHelpers.time.increase(30);

            const merchBalBefore = await MockToken.balanceOf(merchant.address);

            await expect(
                SubscriptionsManagerCore.connect(merchant).charge(0),
            ).to.be.revertedWithCustomError(
                SubscriptionsManagerCore,
                "PaymentNotDue",
            );
        });
    });
});
