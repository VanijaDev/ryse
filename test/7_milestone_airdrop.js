const TestToken = artifacts.require("TestToken");
const aTestToken = artifacts.require("aTestToken");
const MarketContract = artifacts.require("MarketContract");
const MilestoneAirdrop = artifacts.require("MilestoneAirdrop");


const { BN, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { assert } = require('chai');

contract("MilestoneAirdrop", function (accounts) {
  const DEPLOYER = accounts[0];

  let PRESALE_START;
  let SALE_START;
  
  let market;
  let token;
  let aToken;

  beforeEach("deploy contract", async function () {
    await time.advanceBlock();

    PRESALE_START = ((await time.latest()).add(time.duration.seconds(5)));
    SALE_START = ((await time.latest()).add(time.duration.minutes(1)));

    market = await MarketContract.new(PRESALE_START, SALE_START);
    token = await TestToken.at(await market.token.call());
    aToken = await aTestToken.new(await token.totalSupply.call());
  });

  describe("constructor", function () {
    it("should fail if _token == 0", async function () {
      await expectRevert(MilestoneAirdrop.new("0x0000000000000000000000000000000000000000", aToken.address, market.address), "wrong _token");
    });

    it("should fail if _aToken == 0", async function () {
      await expectRevert(MilestoneAirdrop.new(token.address, "0x0000000000000000000000000000000000000000", market.address), "wrong _aToken");
    });

    it("should fail if _marketContractAddress == 0", async function () {
      await expectRevert(MilestoneAirdrop.new(token.address, aToken.address, "0x0000000000000000000000000000000000000000"), "wrong _marketContractAddress");
    });

    it("should set token", async function () {
      let milestone = await MilestoneAirdrop.new(token.address, aToken.address, market.address);
      assert.equal(await milestone.token.call(), token.address, "wrong token");
    });

    it("should set aToken", async function () {
      let milestone = await MilestoneAirdrop.new(token.address, aToken.address, market.address);
      assert.equal(await milestone.aToken.call(), aToken.address, "wrong aToken");
    });

    it("should set marketContractAddress", async function () {
      let milestone = await MilestoneAirdrop.new(token.address, aToken.address, market.address);
      assert.equal(await milestone.marketContractAddress.call(), market.address, "wrong marketContractAddress");
    });
  });

  describe("launchMilestone", async function () {
    it("should set airdropStarted to true", async function () {
      await time.increaseTo(SALE_START);

      let milestoneAirdrop = await MilestoneAirdrop.new(token.address, aToken.address, market.address);
      await (market.addMilestone(ether("0.01"), milestoneAirdrop.address));
      
      assert.isFalse(await milestoneAirdrop.airdropStarted.call(), "should be false before");
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      assert.isTrue(await milestoneAirdrop.airdropStarted.call(), "should be false after");
    });
  });

  describe("claimTokens", async function () {
    beforeEach("setup milestone", async function () {
      await time.increaseTo(SALE_START);

      milestoneAirdrop = await MilestoneAirdrop.new(token.address, aToken.address, market.address);
      await aToken.transfer(milestoneAirdrop.address, await aToken.balanceOf.call(DEPLOYER));
      await (market.addMilestone(ether("0.01"), milestoneAirdrop.address));
    });

    it("should fail if not started yet", async function () {
      await market.buyTokens(100, 100, { from: accounts[1], value: ether("0.0505") });
      await expectRevert(milestoneAirdrop.claimTokens({ from: accounts[1] }), "not started yet");
    });
    
    it("should fail if nothing to claim", async function () {
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      await expectRevert(milestoneAirdrop.claimTokens({ from: accounts[2] }), "nothing to claim");
    });
    
    it("should set correct amount of tokensAirdropped", async function () {
      //  1
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      await milestoneAirdrop.claimTokens({ from: accounts[1] });

      assert.equal(0, (await milestoneAirdrop.tokensAirdropped.call(accounts[1])).cmp(new BN("2222")), "should be 2222");

      //  2
      await market.buyTokens(1234, 1234, { from: accounts[1], value: ether("35.03943") });
      await milestoneAirdrop.claimTokens({ from: accounts[1] });

      assert.equal(0, (await milestoneAirdrop.tokensAirdropped.call(accounts[1])).cmp(new BN("3456")), "should be 3456");
    });
    
    it("should transfer aTokens", async function () {
      //  1
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      await milestoneAirdrop.claimTokens({ from: accounts[1] });

      assert.equal(0, (await aToken.balanceOf.call(accounts[1])).cmp(new BN("2222")), "should be 2222");

      //  2
      await market.buyTokens(1234, 1234, { from: accounts[1], value: ether("35.03943") });
      await milestoneAirdrop.claimTokens({ from: accounts[1] });
      
      assert.equal(0, (await aToken.balanceOf.call(accounts[1])).cmp(new BN("3456")), "should be 3456");
    });
    
    it("should emit Airdropped event", async function () {
      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      let receipt = await milestoneAirdrop.claimTokens({ from: accounts[1] });
      expectEvent(receipt, 'Airdropped', {
        recipient: accounts[1],
        amount: new BN("2222")
      });
    });
  });

  describe("finishMilestone", async function () {
    beforeEach("setup milestone", async function () {
      await time.increaseTo(SALE_START);

      milestoneAirdrop = await MilestoneAirdrop.new(token.address, aToken.address, market.address);
      await aToken.transfer(milestoneAirdrop.address, await aToken.balanceOf.call(DEPLOYER));
      await (market.addMilestone(ether("0.01"), milestoneAirdrop.address));

      await market.buyTokens(2222, 2220, { from: accounts[1], value: ether("24.69753") });
      await milestoneAirdrop.claimTokens({ from: accounts[1] });
    });

    it("should fail if not owner", async function () {
      await expectRevert(milestoneAirdrop.finishMilestone.call({ from: accounts[1] }), "caller is not the owner");
    });

    it("should transfer not used tokens", async function () {
      assert.equal(0, (new BN(await aToken.balanceOf.call(DEPLOYER))).cmp(new BN("0")), "should be 0 before");
      await milestoneAirdrop.finishMilestone();
      assert.equal(0, (new BN(await aToken.balanceOf.call(DEPLOYER))).cmp(new BN("297778")), "should be 297 778 after");  //  300 0000 - 2222 = 2 997 778
    });

    it("should delete contract", async function () {
      assert.isTrue((await web3.eth.getCode(milestoneAirdrop.address)).length > 2, "code should be present before");
      await milestoneAirdrop.finishMilestone();
      assert.isTrue((await web3.eth.getCode(milestoneAirdrop.address)).length == 2, "code should be deleted after");
    
    });
  });
});
