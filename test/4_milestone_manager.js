const TestToken = artifacts.require("TestToken");
const MarketContract = artifacts.require("MarketContract");
const MilestoneBurn = artifacts.require("MilestoneBurn");


const { BN, time, ether, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

contract("MilestoneManager", function (accounts) {
  const DEPLOYER = accounts[0];

  let PRESALE_START;
  let SALE_START;
  
  let market;
  let token;

  beforeEach("deploy contract", async function () {
    PRESALE_START = ((await time.latest()).add(time.duration.minutes(1)));
    SALE_START = ((await time.latest()).add(time.duration.minutes(5)));

    market = await MarketContract.new(PRESALE_START, SALE_START);
    token = await TestToken.at(await market.token.call());
  });

  describe("constructor", function () {
    it("should set milestoneCount == 1", async function () {
      assert.isTrue((await market.milestoneCount.call()) == 1, "should be 1");
    });
  });

  describe("milestoneAtIdx", function () {
    it("should validate first milestone info", async function () {
      let milestoneInfo = await market.milestoneAtIdx.call(0);

      assert.isTrue(milestoneInfo.startPrice == 0, "startPrice should be 0");
      assert.isTrue(milestoneInfo.contractAddress == "0x0000000000000000000000000000000000000000", "contractAddress should be 0");
      assert.isTrue(milestoneInfo.activated, "should be activated");
    });
  });

  describe("addMilestone", function () {
    it("should fail if not owner", async function () {
      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await expectRevert(market.addMilestone(10, milestoneBurn.address, { from: accounts[1] }), "caller is not the owner");
    });

    it("should fail if _contractAddress == 0", async function () {
      await expectRevert(market.addMilestone(10, "0x0000000000000000000000000000000000000000"), "_contractAddress cannt be 0");      
    });

    it("should fail if startPrice is less, than last", async function () {
      let milestoneBurn_1 = await MilestoneBurn.new(market.address, token.address, 20);
      await market.addMilestone(10, milestoneBurn_1.address);

      let milestoneBurn_2 = await MilestoneBurn.new(market.address, token.address, 20);
      await expectRevert(market.addMilestone(9, milestoneBurn_2.address), "startPrice is less, than last");
    });
    
    it("should validate first milestone info", async function () {
      let milestoneBurn_1 = await MilestoneBurn.new(market.address, token.address, 30);
      await market.addMilestone(11, milestoneBurn_1.address);

      let milestoneInfo = await market.milestoneAtIdx.call(1);

      assert.isTrue(milestoneInfo.startPrice == 11, "startPrice should be 11");
      assert.isTrue(milestoneInfo.contractAddress == milestoneBurn_1.address, "contractAddress should be 0");
      assert.isFalse(milestoneInfo.activated, "should be activated");
    });
    
    it("should set milestoneCount to 2", async function () {
      let milestoneBurn_1 = await MilestoneBurn.new(market.address, token.address, 30);
      await market.addMilestone(11, milestoneBurn_1.address);

      assert.isTrue((await market.milestoneCount.call()) == 2, "should be 2");
    });
  });

  describe("launchNextMilestone", function () {
    it("should increase currentMilestoneIdx", async function () {
      await time.increaseTo(SALE_START);
      
      let tokenPrice_100 = new BN(await market.priceForExactToken.call(100));
      let milestoneStartPrice = tokenPrice_100.div(new BN("2"));

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await market.addMilestone(milestoneStartPrice, milestoneBurn.address);

      assert.equal(0, new BN(await market.currentMilestoneIdx.call()).cmp(new BN("0")), "currentMilestoneIdx should be 0 before");
      await market.buyTokens(100, 99, { from: accounts[1], value: ether("0.0505") });
      assert.equal(0, new BN(await market.currentMilestoneIdx.call()).cmp(new BN("1")), "currentMilestoneIdx should be 1 after");
    });

    it("should set next milestone to avtivated", async function () {
      await time.increaseTo(SALE_START);
      
      let tokenPrice_100 = new BN(await market.priceForExactToken.call(100));
      let milestoneStartPrice = tokenPrice_100.div(new BN("2"));

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await market.addMilestone(milestoneStartPrice, milestoneBurn.address);

      assert.isFalse((await market.milestoneAtIdx.call(1)).activated, "should not be activate before");
      await market.buyTokens(100, 99, { from: accounts[1], value: ether("0.0505") });
      assert.isTrue((await market.milestoneAtIdx.call(1)).activated, "should be activate after");
    });

    it("should emit MilestoneLaunched event", async function () {
      await time.increaseTo(SALE_START);
      
      let tokenPrice_100 = new BN(await market.priceForExactToken.call(100));
      let milestoneStartPrice = tokenPrice_100.div(new BN("2"));

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await market.addMilestone(milestoneStartPrice, milestoneBurn.address);

      const receipt = await market.buyTokens(100, 99, { from: accounts[1], value: ether("0.0505") });
      expectEvent(receipt, 'MilestoneLaunched', {
        milestone: milestoneBurn.address
      });
    });
  });
});