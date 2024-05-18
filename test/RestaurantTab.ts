import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("RestaurantTab", function () {
  const ONE_GWEI = 1_000_000_000;
  const tabLimit = ONE_GWEI * 100_000;
  async function deployRestaurantTab() {

    // Contracts are deployed using the first signer/account by default
    const [tabOwnerAccount, restaurantAccount, friend1, friend2, friend3RunningLate, partyCrasher1] = await hre.ethers.getSigners();
    const RestaurantTab = await hre.ethers.getContractFactory("RestaurantTab");
    const friendsWhoArriveWithTabOwner = [friend1, friend2];
    const restaurantTab = await RestaurantTab.deploy(restaurantAccount, friendsWhoArriveWithTabOwner, { value: tabLimit });

    return { restaurantTab, tabOwnerAccount, restaurantAccount, friend1, friend2, friend3RunningLate, partyCrasher1 };
  }

  describe("Deployment", async () => {
    it("should deploy fine with a user and a restaurant", async () => {
      await loadFixture(deployRestaurantTab);
    });
    it("should not deploy if a user tries to deploy with themselves as the restaurant", async () => {
      async function deployInvalidRestaurantTab() {
        // Contracts are deployed using the first signer/account by default
        const [restaurantAccount] = await hre.ethers.getSigners();
        const RestaurantTab = await hre.ethers.getContractFactory("RestaurantTab");
        const restaurantTab = await RestaurantTab.deploy(restaurantAccount, [], { value: tabLimit });
    
        return { restaurantTab, restaurantAccount };
      }
      await expect(loadFixture(deployInvalidRestaurantTab)).to.be.revertedWith("user cannot be the same as the restaurant.");
    });
  });

  describe("opening a tab", async () => {
    it("should allow a user to open a tab with a restaurant", async () => {
      const { restaurantTab, tabOwnerAccount, restaurantAccount } = await loadFixture(deployRestaurantTab);
      expect(await restaurantTab.owner()).to.equal(tabOwnerAccount.address);
      expect(await restaurantTab.restaurant()).to.equal(restaurantAccount.address);
    });
    it("should have added the tabowner, friend1, and friend2 to the party", async () => {
      const { restaurantTab, tabOwnerAccount, friend1, friend2 } = await loadFixture(deployRestaurantTab);
      expect(await hre.ethers.provider.getBalance(restaurantTab)).to.equal(tabLimit);
      const partyMembers = await restaurantTab.getPartyMembers();
      expect(partyMembers.length).to.equal(3);
      expect(partyMembers).to.include(tabOwnerAccount.address);
      expect(partyMembers).to.include(friend1.address);
      expect(partyMembers).to.include(friend2.address);
    });
    it("should not have any users who are not part of the party, such as the restaurantAccount, ", async () => {
      const { restaurantTab, friend3RunningLate, restaurantAccount, partyCrasher1 } = await loadFixture(deployRestaurantTab);
      const partyMembers = await restaurantTab.getPartyMembers();
      expect(partyMembers).to.not.include(friend3RunningLate.address);
      expect(partyMembers).to.not.include(restaurantAccount.address);
      expect(partyMembers).to.not.include(partyCrasher1.address);
    });
  });
  describe("adding party members", () => {
    it("should allow the tab owner to add friends who come late", async () => {
      const { restaurantTab, tabOwnerAccount, friend3RunningLate } = await loadFixture(deployRestaurantTab);
      let members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(3);
      expect(await restaurantTab.getIsMemberInParty(friend3RunningLate.address)).to.equal(false);
      await restaurantTab.connect(tabOwnerAccount).addUserToParty(friend3RunningLate.address);
      members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(4);
      expect(await restaurantTab.getIsMemberInParty(friend3RunningLate.address)).to.equal(true);
    });
    it("should not allow you to add the restaurant", async () => {
      const three = 3;
      const { restaurantTab, tabOwnerAccount, restaurantAccount } = await loadFixture(deployRestaurantTab);
      let members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(three);
      const tryingToAddRestaurant = restaurantTab.connect(tabOwnerAccount).addUserToParty(restaurantAccount.address)
      await expect(tryingToAddRestaurant).to.be.reverted;
      await expect(tryingToAddRestaurant).to.be.revertedWith("cannot add the restaurant to your party.");
      members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(three);
      expect(await restaurantTab.getIsMemberInParty(restaurantAccount.address)).to.equal(false);
    });
    it("should not allow non-owner to add new members", async () => {
      const three = 3;
      const { restaurantTab, friend1, friend3RunningLate } = await loadFixture(deployRestaurantTab);
      let members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(three);
      const tryingToAddRestaurant = restaurantTab.connect(friend1).addUserToParty(friend3RunningLate.address);
      await expect(tryingToAddRestaurant).to.be.reverted;
      await expect(tryingToAddRestaurant).to.be.revertedWith("you did not open the tab.");
      members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(three);
      expect(await restaurantTab.getIsMemberInParty(friend3RunningLate.address)).to.equal(false);
    });
    it("should not have adding already existing members to be idempotent", async () => {
      const three = 3;
      const { restaurantTab, tabOwnerAccount, friend1 } = await loadFixture(deployRestaurantTab);
      let members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(three);
      await restaurantTab.connect(tabOwnerAccount).addUserToParty(friend1.address);
      members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(three);
    });
  });
  describe("removing party members", async () => {
    it("should allow the owner to remove a party member", async () => {
      const { restaurantTab, tabOwnerAccount, friend1 } = await loadFixture(deployRestaurantTab);
      let members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(3);
      expect(await restaurantTab.getIsMemberInParty(friend1.address)).to.equal(true);
      await restaurantTab.connect(tabOwnerAccount).removeUserFromParty(friend1.address);
      members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(2);
      expect(await restaurantTab.getIsMemberInParty(friend1.address)).to.equal(false);
    });
    it("should not allow non-owner to remove a party member", async () => {
      const { restaurantTab, friend1, friend2 } = await loadFixture(deployRestaurantTab);
      let members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(3);
      expect(await restaurantTab.getIsMemberInParty(friend1.address)).to.equal(true);
      await expect(restaurantTab.connect(friend2).removeUserFromParty(friend1.address)).to.be.reverted;
      await expect(restaurantTab.connect(friend2).removeUserFromParty(friend1.address)).to.be.revertedWith("you did not open the tab.");
      expect(members.length).to.equal(3);
      expect(await restaurantTab.getIsMemberInParty(friend1.address)).to.equal(true);

    });
    it("should be idempotent to remove a member", async () => {
      const { restaurantTab, tabOwnerAccount, friend1 } = await loadFixture(deployRestaurantTab);
      let members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(3);
      expect(await restaurantTab.getIsMemberInParty(friend1.address)).to.equal(true);
      await restaurantTab.connect(tabOwnerAccount).removeUserFromParty(friend1.address);
      await restaurantTab.connect(tabOwnerAccount).removeUserFromParty(friend1.address);
      members = await restaurantTab.getPartyMembers();
      expect(members.length).to.equal(2);
      expect(await restaurantTab.getIsMemberInParty(friend1.address)).to.equal(false);
    });
  });
  describe("using funds", async () => {
    it("can only be spent if the tab is open", async () => {
      const { restaurantTab, tabOwnerAccount, friend1 } = await loadFixture(deployRestaurantTab);
      expect(await restaurantTab.getRemainingSpendableAmount()).to.equal(tabLimit);
      const foodPrice = 50 * ONE_GWEI;
      await restaurantTab.connect(friend1).spendFunds(foodPrice);
      expect(await restaurantTab.getRemainingSpendableAmount()).to.equal(tabLimit - foodPrice);
      await restaurantTab.connect(tabOwnerAccount).closeBillAndPay();
      await expect(restaurantTab.connect(friend1).spendFunds(1)).to.be.reverted;
      await expect(restaurantTab.connect(friend1).spendFunds(1)).to.be.revertedWith("tab is not open.");

    });
    it("can will not allow non-party members to spend", async () => {
      const { restaurantTab, partyCrasher1, restaurantAccount } = await loadFixture(deployRestaurantTab);
      expect(await restaurantTab.getRemainingSpendableAmount()).to.equal(tabLimit);
      // party crasher tries to spend
      await expect(restaurantTab.connect(partyCrasher1).spendFunds(1)).to.be.reverted;
      await expect(restaurantTab.connect(partyCrasher1).spendFunds(1)).to.be.revertedWith("user is not part of this tab's party.");
      expect(await restaurantTab.getRemainingSpendableAmount()).to.equal(tabLimit);
      // restaurant tries to spend
      await expect(restaurantTab.connect(restaurantAccount).spendFunds(1)).to.be.reverted;
      await expect(restaurantTab.connect(restaurantAccount).spendFunds(1)).to.be.revertedWith("user is not part of this tab's party.");
      expect(await restaurantTab.getRemainingSpendableAmount()).to.equal(tabLimit);
    });
    it("can only be used if the price of an item does not make the tab limit exceed", async () => {
      const { restaurantTab, friend1 } = await loadFixture(deployRestaurantTab);
      const expensiveFoodItemprice = tabLimit + 1;
      await expect(restaurantTab.connect(friend1).spendFunds(expensiveFoodItemprice)).to.be.reverted;
      await expect(restaurantTab.connect(friend1).spendFunds(expensiveFoodItemprice)).to.be.revertedWith("funds remaining will not cover the expense.");
      const cheapFooditemWithinLimit = 1;
      await restaurantTab.connect(friend1).spendFunds(cheapFooditemWithinLimit);
      expect(await restaurantTab.getRemainingSpendableAmount()).to.equal(tabLimit - cheapFooditemWithinLimit);
    });
    it("can allow user to add funds", async () => {
      const { restaurantTab, tabOwnerAccount } = await loadFixture(deployRestaurantTab);
      const fundsBefore = await restaurantTab.getRemainingSpendableAmount();
      await restaurantTab.connect(tabOwnerAccount).addFunds({ value: tabLimit });
      const currentAmountOfFunds = await restaurantTab.getRemainingSpendableAmount();
      expect(currentAmountOfFunds).to.be.greaterThanOrEqual(fundsBefore);
      expect(currentAmountOfFunds).to.be.equal(fundsBefore + BigInt(tabLimit));
      expect(currentAmountOfFunds).to.be.equal(await hre.ethers.provider.getBalance(restaurantTab));
    });
  });
  describe("closing the bill", async () => {
    it("allows the tab owner to close", async () => {
      const { restaurantTab, tabOwnerAccount } = await loadFixture(deployRestaurantTab);
      expect(await restaurantTab.isOpen()).to.equal(true);
      await restaurantTab.connect(tabOwnerAccount).closeBillAndPay();
      expect(await restaurantTab.isOpen()).to.equal(false);
    });
    it("does not allow anyone else to close except tab owner", async () => {
      const { restaurantTab, friend1 } = await loadFixture(deployRestaurantTab);
      expect(await restaurantTab.isOpen()).to.equal(true);
      await expect(restaurantTab.connect(friend1).closeBillAndPay()).to.be.reverted;
      await expect(restaurantTab.connect(friend1).closeBillAndPay()).to.be.revertedWith("you did not open the tab.");
      expect(await restaurantTab.isOpen()).to.equal(true);
    });
    it("does not allow any more purchases after the bill is closed.", async () => {
      const { restaurantTab, tabOwnerAccount, friend1, } = await loadFixture(deployRestaurantTab);
      expect(await restaurantTab.isOpen()).to.equal(true);
      await restaurantTab.connect(tabOwnerAccount).closeBillAndPay();
      expect(await restaurantTab.isOpen()).to.equal(false);
      await expect(restaurantTab.connect(friend1).spendFunds(50 * ONE_GWEI)).to.be.reverted;
      await expect(restaurantTab.connect(tabOwnerAccount).spendFunds(1)).to.be.reverted;
    });
    it("pays the restaurant the amount billed, and returns remainder to the tabOwner after the tabOwner closes tab", async () => {
      const { restaurantTab, tabOwnerAccount, friend1, restaurantAccount } = await loadFixture(deployRestaurantTab);
      const [restaurantAccounttBalanceBefore, tabOwnerAccountBalanceBefore, friend1BalanceBefore] = await Promise.all(
        [restaurantAccount, tabOwnerAccount, friend1].map(account => hre.ethers.provider.getBalance(account))
      );

      const spendAmount = BigInt(100_000 * ONE_GWEI);

      expect(await restaurantTab.connect(friend1).spendFunds(spendAmount));
      await restaurantTab.connect(tabOwnerAccount).closeBillAndPay();
      expect(await restaurantTab.getRemainingSpendableAmount()).to.equal(0);
      expect(await hre.ethers.provider.getBalance(restaurantTab)).to.equal(0);

      const [restaurantBalance, tabOwnerBalance, friend1Balance] = await Promise.all(
        [restaurantAccount, tabOwnerAccount, friend1].map(account => hre.ethers.provider.getBalance(account))
      );
      expect(restaurantBalance).to.be.equal(restaurantAccounttBalanceBefore + spendAmount);
      expect(tabOwnerBalance).to.be.lessThan(tabOwnerAccountBalanceBefore);
      expect(friend1Balance).to.be.lessThan(friend1BalanceBefore);
    });
  });
  describe("events", () => {
    it("should emit events when party members are added", async () => {
      const { restaurantTab, tabOwnerAccount, friend3RunningLate } = await loadFixture(deployRestaurantTab);

      await expect(restaurantTab.connect(tabOwnerAccount).addUserToParty(friend3RunningLate.address))
        .to.emit(restaurantTab, "PartyMemberAdded")
        .withArgs(friend3RunningLate.address, anyValue);
    });
    it("should emit events when funds are added", async () => {
      const { restaurantTab, tabOwnerAccount } = await loadFixture(deployRestaurantTab);
      const amount = BigInt(ONE_GWEI * 100_000);
      await expect(restaurantTab.connect(tabOwnerAccount).addFunds({ value: amount }))
        .to.emit(restaurantTab, "FundsAdded")
        .withArgs(tabOwnerAccount, amount, anyValue);
    });
    it("should emit events when tab is closed.", async () => {
      const { restaurantTab, tabOwnerAccount, restaurantAccount } = await loadFixture(deployRestaurantTab);
      await expect(restaurantTab.connect(tabOwnerAccount).closeBillAndPay())
        .to.emit(restaurantTab, "TabClosedAndBillPaid")
        .withArgs(restaurantAccount, tabOwnerAccount, anyValue, anyValue);
    });
  });
});
