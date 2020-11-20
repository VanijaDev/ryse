const TestToken = artifacts.require("TestToken");
const MarketContract = artifacts.require("MarketContract");

const { BN, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

contract("TestToken", function (accounts) {
  const DEPLOYER = accounts[0];
  
  let MARKET;
  let token;

  beforeEach("deploy contract", async function () {
    await time.advanceBlock();
    
    MARKET = await MarketContract.new((await time.latest()) + 1, (await time.latest()) + 2);
    token = await TestToken.at(await MARKET.token.call());
  });

  describe("constructor", function () {
    it("should validate _totalSupply", async function () {
      assert.equal(0, (await token.totalSupply.call()).cmp(new BN("300000")), "wrong _totalSupply");
    });

    it("should transfer 1,000 to 0xdD870fA1b7C4700F2BD7f44238821C26f7392148 (team_1)", async function () {
      assert.equal(0, (await token.balanceOf.call("0xdD870fA1b7C4700F2BD7f44238821C26f7392148")).cmp(new BN("10000")), "wrong team_1 balance");
    });

    it("should transfer 1,000 to 0x583031D1113aD414F02576BD6afaBfb302140225 (team_2)", async function () {
      assert.equal(0, (await token.balanceOf.call("0x583031D1113aD414F02576BD6afaBfb302140225")).cmp(new BN("10000")), "wrong team_2 balance");      
    });

    it("should transfer 1,000 to 0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB (team_3)", async function () {
      assert.equal(0, (await token.balanceOf.call("0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB")).cmp(new BN("10000")), "wrong team_3 balance"); 
      
    });

    it("should transfer 1,000 to 0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C (marketing)", async function () {
      assert.equal(0, (await token.balanceOf.call("0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C")).cmp(new BN("10000")), "wrong marketing balance"); 
    });

    it("should transfer 26,000 to MARKET", async function () {
      assert.equal(0, (await token.balanceOf.call(MARKET.address)).cmp(new BN("260000")), "wrong MARKET balance"); 
    });
  });

  describe("burn", function () {
    it("should fail if not owner", async function () {
      await expectRevert(token.burn(MARKET.address, 20, { from: accounts[0] }), "Ownable: caller is not the owner");
    });

    it("should fail if provided address has not enough tokens", async function () {
      await expectRevert(token.burn(accounts[3], 20, {from:MARKET.address}), "not enough tokens");
    });

    it("should sub correct token amount from provided address", async function () {
      let token_loc = await TestToken.new();

      let tokensToBurn = new BN("52 000");  // 260000 * 0.2
      await token_loc.burn(DEPLOYER, tokensToBurn, { from: DEPLOYER });
      let balanceAfter = await token_loc.balanceOf.call(DEPLOYER);

      let correctBalanceAfter = new BN("208 000");  // 260000 - 52 000
      assert.equal(0, balanceAfter.cmp(correctBalanceAfter), "wrong balance after burn");
    });

    it("should sub correct token amount from total supply", async function () {
      let token_loc = await TestToken.new();

      let tokensToBurn = new BN("52 000");  // 260000 * 0.2
      await token_loc.burn(DEPLOYER, tokensToBurn, { from: DEPLOYER });
      let balanceAfter = await token_loc.totalSupply.call();

      let correctBalanceAfter = new BN("248 000");  // 300000 - 52 000
      assert.equal(0, balanceAfter.cmp(correctBalanceAfter), "wrong balance after burn");
    });

    it("should emit BurnTokens", async function () {
      let token_loc = await TestToken.new();

      let tokensToBurn = new BN("52 000");  // 260000 * 0.2
      let receipt = await token_loc.burn(DEPLOYER, tokensToBurn, { from: DEPLOYER });

      expectEvent(receipt, 'BurnTokens', {
        tokens: tokensToBurn.toString()
      });
    });
  });
});
