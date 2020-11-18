const TestToken = artifacts.require("TestToken");
const MarketContract = artifacts.require("MarketContract");
const MilestoneBurn = artifacts.require("MilestoneBurn");


const { BN, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

contract("MilestoneManager", function (accounts) {
  const DEPLOYER = accounts[0];
  
  let market;
  let token;

  beforeEach("deploy contract", async function () {
    market = await MarketContract.new((await time.latest()) + 1, (await time.latest()) + 2);
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

  describe.only("addMilestone", function () {
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
});