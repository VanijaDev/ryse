const TestToken = artifacts.require("TestToken");
const aTestToken = artifacts.require("aTestToken");
const MarketContract = artifacts.require("MarketContract");
const MilestoneBurn = artifacts.require("MilestoneBurn");


const { BN, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { assert } = require('chai');

contract("MilestoneBurn", function (accounts) {
  const DEPLOYER = accounts[0];

  let PRESALE_START;
  let SALE_START;
  
  let market;
  let token;

  beforeEach("deploy contract", async function () {
    await time.advanceBlock();

    PRESALE_START = ((await time.latest()).add(time.duration.seconds(5)));
    SALE_START = ((await time.latest()).add(time.duration.minutes(1)));

    market = await MarketContract.new(PRESALE_START, SALE_START);
    token = await TestToken.at(await market.token.call());
  });

  describe("constructor", function () {
    it("should fail if _marketContract == 0", async function () {
      await expectRevert(MilestoneBurn.new("0x0000000000000000000000000000000000000000", token.address, 20), "wrong _marketContract");
    });
    
    it("should fail if _token == 0", async function () {
      await expectRevert(MilestoneBurn.new(market.address, "0x0000000000000000000000000000000000000000", 20), "wrong _token");
    });
    
    it("should fail if wrong _burnPercentage", async function () {
      await expectRevert(MilestoneBurn.new(market.address, token.address, 0), "wrong _burnPercentage");
      await expectRevert(MilestoneBurn.new(market.address, token.address, 100), "wrong _burnPercentage");
      await expectRevert(MilestoneBurn.new(market.address, token.address, 101), "wrong _burnPercentage");
    });
    
    it("should set requireTokenOwnership to true", async function () {
      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      assert.isTrue(await milestoneBurn.requireTokenOwnership.call(), "requireTokenOwnership must be true");
    });
    
    it("should set burnPercent", async function () {
      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      assert.equal(0, new BN(await milestoneBurn.burnPercent.call()).cmp(new BN("20")), "burnPercent must be 20");

      let milestoneBurn_1 = await MilestoneBurn.new(market.address, token.address, 42);
      assert.equal(0, new BN(await milestoneBurn_1.burnPercent.call()).cmp(new BN("42")), "burnPercent_1 must be 42");
    });
    
    it("should set deployer as msg.sender", async function () {
      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      assert.equal(DEPLOYER, await milestoneBurn.deployer.call(), "deployer must be DEPLOYER");
    });
    
    it("should set marketContract", async function () {
      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      assert.equal(await milestoneBurn.marketContract.call(), market.address, "wrong marketContract");
    });
    
    it("should set token", async function () {
      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      assert.equal(await milestoneBurn.token.call(), token.address, "wrong token");
    });
  });

  describe("launchMilestone", function () {
    it("should burn correct token amount from totalSupply", async function () {
      await time.increaseTo(SALE_START);

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await (market.addMilestone(ether("0.01"), milestoneBurn.address));
      
      assert.equal(0, (new BN(await token.totalSupply.call())).cmp(new BN("300000")), "should be 300000 before");
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      let tokensLeft = (new BN("248 445"));  //  300000 - (260000 - 2222) * 0.2 = 248 445
      assert.equal(0, (new BN(await token.totalSupply.call())).cmp(tokensLeft), "should be tokensLeft after");
    });

    it("should burn correct token amount from market balance", async function () {
      await time.increaseTo(SALE_START);

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await (market.addMilestone(ether("0.01"), milestoneBurn.address));
      
      assert.equal(0, (new BN(await token.totalSupply.call())).cmp(new BN("300000")), "should be 300000 before");
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      let tokensLeft = (new BN("206 223"));  //  (260000 - 2222) * 0.8 = 206 223
      assert.equal(0, (new BN(await token.balanceOf(market.address))).cmp(tokensLeft), "should be tokensLeft after");
    });

    it("should transferTokenOwnership back to market", async function () {
      await time.increaseTo(SALE_START);

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await (market.addMilestone(ether("0.01"), milestoneBurn.address));
      
      assert.equal(await token.owner.call(), market.address, "market should be owner before");
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      assert.equal(await token.owner.call(), market.address, "market should be owner after");
    });

    it("should destroy - milestone", async function () {
      await time.increaseTo(SALE_START);

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await (market.addMilestone(ether("0.01"), milestoneBurn.address));
      
      assert.isTrue((await web3.eth.getCode(milestoneBurn.address)).length > 2, "code should be present before");
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      assert.isTrue((await web3.eth.getCode(milestoneBurn.address)).length == 2, "code should be deleted after");
    });
  });
});
