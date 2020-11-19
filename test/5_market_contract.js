const TestToken = artifacts.require("TestToken");
const aTestToken = artifacts.require("aTestToken");
const MarketContract = artifacts.require("MarketContract");
const MilestoneBurn = artifacts.require("MilestoneBurn");


const { BN, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { assert } = require('chai');

contract("MarketContract", function (accounts) {
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
    it("should create token", async function () {
      assert.isTrue(token.address != "0x0000000000000000000000000000000000000000", "token address should be > 0x0");
    });
  });

  describe("buyTokens", function () {
    it("should fail if _tokensOutMin == 0", async function () {
      await expectRevert(market.buyTokens(0, 0), "must be > 0");
      await expectRevert(market.buyTokens(10, 0), "must be > 0");
    });

    it("should fail if user is not allowed for presale", async function () {
      await time.increaseTo(PRESALE_START);
      await expectRevert(market.buyTokens(100, 99, { from: accounts[1], value: ether("0.0505") }), "presale not allowed");
    });

    it("should fail if before presale & sale", async function () {
      await expectRevert(market.buyTokens(100, 99, { from: accounts[1], value: ether("0.0505") }), "not sale period");
    });

    it("should fail if _tokensOutMin < tokens calculated", async function () {
      await time.increaseTo(SALE_START);
      await expectRevert(market.buyTokens(101, 101, { from: accounts[1], value: ether("0.0505") }), "less than min");
    });

    it("should return part of value if difference is precent", async function () {
      await time.increaseTo(SALE_START);

      let balanceBefore = new BN(await web3.eth.getBalance(accounts[1]));
      let tx = await market.buyTokens(100, 100, { from: accounts[1], value: ether("0.050555") });
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      let balanceAfter = new BN(await web3.eth.getBalance(accounts[1]));
      assert.equal(0, balanceBefore.sub(gasSpent).sub(ether("0.050555")).add(ether("0.000055")).cmp(balanceAfter), "should have 0.000055 eth extra");
    });

    it("should transfer correct tokens to buyer", async function () {
      await time.increaseTo(SALE_START);

      assert.equal(0, (await token.balanceOf(accounts[1])).cmp(new BN("0")), "should own 0 tokens before");
      await market.buyTokens(100, 90, { from: accounts[1], value: ether("0.0505") });
      assert.equal(0, (await token.balanceOf(accounts[1])).cmp(new BN("100")), "should own 100 tokens after");
    });

    it("should update tokensBought", async function () {
      await time.increaseTo(SALE_START);
      
      assert.equal(0, (await market.tokensBought.call()).cmp(new BN("0")), "should be 0 tokens before");
      await market.buyTokens(100, 90, { from: accounts[1], value: ether("0.0505") });
      assert.equal(0, (await market.tokensBought.call()).cmp(new BN("100")), "should be 100 tokens after");
    });

    it("should launchNextMilestone if needed", async function () {
      await time.increaseTo(SALE_START);
      
      let tokenPrice_100 = new BN(await market.priceForExactToken.call(100));
      let milestoneStartPrice = tokenPrice_100.div(new BN("2"));

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await market.addMilestone(milestoneStartPrice, milestoneBurn.address);

      assert.equal(0, new BN(await market.currentMilestoneIdx.call()).cmp(new BN("0")), "currentMilestoneIdx should be 0 before");
      await market.buyTokens(100, 99, { from: accounts[1], value: ether("0.0505") });
      assert.equal(0, new BN(await market.currentMilestoneIdx.call()).cmp(new BN("1")), "currentMilestoneIdx should be 1 after");
    });

    it("should emit TokensBought event", async function () {
      await time.increaseTo(SALE_START);
      const receipt = await market.buyTokens(100, 90, { from: accounts[1], value: ether("0.0505") });
      expectEvent(receipt, 'TokensBought', {
        purchaser: accounts[1],
        amount: new BN("100"),
        value: ether("0.0505")
      });
    });
  });

  describe("valueToBuyExactTokens", function () {
    it("should fail if 0 tokens to buy", async function () {
      await expectRevert(market.valueToBuyExactTokens.call(0), "must be > 0");
    });

    it("should return correct price for 0 - 10 tokens", async function () {
      let value = await market.valueToBuyExactTokens.call(10);
      assert.equal(0, (value).cmp(ether("0.00055")), "wrong value, should be 0.00055 eth");
    });

    it("should return correct price for 10.1 - 100.0 tokens", async function () {
      await time.increaseTo(SALE_START);
      await market.buyTokens(100, 99, {from: accounts[1], value: ether("0.0505")});

      let value = await market.valueToBuyExactTokens.call(900);
      assert.equal(0, (value).cmp(ether("4.9545")), "wrong value, should be 4.9545 eth");
    });

    it("should return correct price for 500.1 - 2454.1 tokens", async function () {
      // let value = await market.valueToBuyExactTokens.call(100);
      // console.log(value.toString());

      await time.increaseTo(SALE_START);
      await market.buyTokens(5000, 5000, {from: accounts[1], value: ether("125.025")});

      let value = await market.valueToBuyExactTokens.call(19541);
      assert.equal(0, (value).cmp(ether("2886.40111")), "wrong value, should be 2886.40111 eth");
    });
  });

  describe("sellTokens", function () {
    it("should fail if _valueOutMin == 0", async function () {
      await expectRevert(market.sellTokens(0, 0), "must be > 0");
      await expectRevert(market.sellTokens(0, 10), "must be > 0");
      await expectRevert(market.sellTokens(10, 0), "must be > 0");
    });

    it("should fail if not enough tokens", async function () {
      await expectRevert(market.sellTokens(100, 100), "not enough tokens");
    });

    it("should fail if calculated eth < _valueOutMin", async function () {
      await time.increaseTo(SALE_START);
      await market.buyTokens(100, 90, { from: accounts[1], value: ether("0.0505") });

      await expectRevert(market.sellTokens(100, ether("5.0505"), { from: accounts[1] }), "ethOut < _valueOutMin");
    });

    it("should fail if token amount not allowed", async function () {
      await time.increaseTo(SALE_START);
      await market.buyTokens(100, 90, { from: accounts[1], value: ether("0.0505") });

      await expectRevert(market.sellTokens(100, ether("0.0505"), { from: accounts[1] }), "amount not allowed");
    });

    it("should transfer tokens from user to Smart Contract", async function () {
      await time.increaseTo(SALE_START);
      await market.buyTokens(100, 90, { from: accounts[1], value: ether("0.0505") });

      await token.approve(market.address, ether("1"), { from: accounts[1] });
      
      let accountTokens = new BN(await token.balanceOf(accounts[1]));
      assert.equal(0, accountTokens.cmp(new BN("100")), "account should own 100 tokens before");

      let marketTokens = new BN(await token.balanceOf(market.address));
      assert.equal(0, marketTokens.cmp(new BN("259900")), "market should own 259900 tokens before");

      await market.sellTokens(100, ether("0.0505"), { from: accounts[1] });

      accountTokens = new BN(await token.balanceOf(accounts[1]));
      assert.equal(0, accountTokens.cmp(new BN("0")), "account should own 0 tokens after");

      marketTokens = new BN(await token.balanceOf(market.address));
      assert.equal(0, marketTokens.cmp(new BN("260000")), "market should own 260000 tokens after");
    });

    it("should update tokensBought", async function () {
      await time.increaseTo(SALE_START);
      await market.buyTokens(100, 90, { from: accounts[1], value: ether("0.0505") });

      await token.approve(market.address, ether("1"), { from: accounts[1] });
      
      assert.equal(0, (new BN(await market.tokensBought.call())).cmp(new BN("100")), "tokensBought should own 100 tokens before");
      await market.sellTokens(100, ether("0.0505"), { from: accounts[1] });
      assert.equal(0, (new BN(await market.tokensBought.call())).cmp(new BN("0")), "tokensBought should own 0 tokens after");
    });

    it("should emit TokensSold event", async function () {
      await time.increaseTo(SALE_START);
      await market.buyTokens(100, 90, { from: accounts[1], value: ether("0.0505") });

      await token.approve(market.address, ether("1"), { from: accounts[1] });
      let receipt = await market.sellTokens(100, ether("0.0505"), { from: accounts[1] });
      expectEvent(receipt, 'TokensSold', {
        seller: accounts[1],
        amount: new BN("100"),
        value: ether("0.0505")
      });
    });
  });

  describe("valueToSellExactTokens", function () {
    it("should fail if 0 tokens to sell", async function () {
      await expectRevert(market.valueToSellExactTokens.call(0), "must be > 0");
    });

    it("should return correct price for 10.0 - 0.0, 10.0 - 0.5 tokens", async function () {
      await time.increaseTo(SALE_START);

      let valueBuySell = await market.valueToBuyExactTokens.call(10);
      await market.buyTokens(10, 10, { from: accounts[1], value: valueBuySell });
      
      //  1
      let valueSell = await market.valueToSellExactTokens.call(10);
      assert.equal(0, (valueSell).cmp(valueBuySell), "wrong value, valueBuySell should be == valueSell");

      //  2
      let valueSell_2 = await market.valueToSellExactTokens.call(6);
      assert.equal(0, (valueSell_2).cmp(ether("0.00045")), "wrong value, valueSell_2 should be == 0.00045 eth");
    });

    it("should return correct price for 100.0 - 65.0, 100.0 - 45.3, 100.0 - 24.5, 100.0 - 1.0  tokens", async function () {
      await time.increaseTo(SALE_START);

      let valueBuy = await market.valueToBuyExactTokens.call(1000);
      assert.equal(0, (valueBuy).cmp(ether("5.005")), "wrong value, valueBuy should be == 5.005 eth");
      await market.buyTokens(1000, 1000, {from: accounts[1], value: valueBuy});

      //  100.0 - 65.0
      let valueSell_1 = await market.valueToSellExactTokens.call(351);
      assert.equal(0, (valueSell_1).cmp(ether("2.89575")), "wrong value, valueSell_1 should be == 2.89575 eth");

      //  100.0 - 45.3
      let valueSell_2 = await market.valueToSellExactTokens.call(548);
      assert.equal(0, (valueSell_2).cmp(ether("3.98122")), "wrong value, valueSell_2 should be == 3.98122 eth");

      //  100.0 - 24.5
      let valueSell_3 = await market.valueToSellExactTokens.call(756);
      assert.equal(0, (valueSell_3).cmp(ether("4.7061")), "wrong value, valueSell_3 should be == 4.7061 eth");

      //  100.0 - 1.0
      let valueSell_4 = await market.valueToSellExactTokens.call(991);
      assert.equal(0, (valueSell_4).cmp(ether("5.00455")), "wrong value, valueSell_4 should be == 5.00455 eth");
    });

    it("should return correct price for 4567.8 - 4000.0, 4567.8 - 3210.4, 4567.8 - 1234.5 tokens", async function () {
      await time.increaseTo(SALE_START);

      let valueBuy = await market.valueToBuyExactTokens.call(45678);
      assert.equal(0, (valueBuy).cmp(ether("10432.62681")), "wrong value, valueBuy should be == 10432.62681 eth");
      await market.buyTokens(45678, 45678, {from: accounts[1], value: valueBuy});

      //  4567.8 - 4000.0
      let valueSell_1 = await market.valueToSellExactTokens.call(5679);
      assert.equal(0, (valueSell_1).cmp(ether("2432.82681")), "wrong value, valueSell_1 should be == 2432.82681 eth");

      //  4567.8 - 3210.4
      let valueSell_2 = await market.valueToSellExactTokens.call(13575);
      assert.equal(0, (valueSell_2).cmp(ether("5279.45325")), "wrong value, valueSell_2 should be == 5279.45325 eth");

      //  4567.8 - 1234.5
      let valueSell_3 = await market.valueToSellExactTokens.call(33334);
      assert.equal(0, (valueSell_3).cmp(ether("9670.69341")), "wrong value, valueSell_3 should be == 9670.69341 eth");
    });
  });

  describe("priceForExactToken", function () {
    it("should return price 0.0001 ETH for token 10 (1.0 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(10)).cmp(ether("0.0001")), "wrong price, should be 0.0001");
    });

    it("should return price 0.01111 ETH for token 1111 (111.1 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(1111)).cmp(ether("0.01111")), "wrong price, should be 0.01111");
    });

    it("should return price 0.06454 ETH for token 6454 (645.4 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(6454)).cmp(ether("0.06454")), "wrong price, should be 0.06454");
    });

    it("should return price 0.2542 ETH for token 25420 (2542.0 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(25420)).cmp(ether("0.2542")), "wrong price, should be 0.2542");
    });

    it("should return price 0.67274 ETH for token 67274 (6727.4 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(67274)).cmp(ether("0.67274")), "wrong price, should be 0.67274");
    });

    it("should return price 0.9733 ETH for token 97330 (9733.0 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(97330)).cmp(ether("0.9733")), "wrong price, should be 0.9733");
    });

    it("should return price 1.15164 ETH for token 115164 (11516.4 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(115164)).cmp(ether("1.15164")), "wrong price, should be 1.15164");
    });

    it("should return price 1.40222 ETH for token 140222 (14022.2 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(140222)).cmp(ether("1.40222")), "wrong price, should be 1.40222");
    });

    it("should return price 2.4792 ETH for token 247920 (24792.0 solid)", async function () {
      assert.equal(0, (await market.priceForExactToken.call(247920)).cmp(ether("2.4792")), "wrong price, should be 2.4792");
    });
  });

  describe("balance", function () {
    it("should return correct balance after buy", async function () {
      await time.increaseTo(SALE_START);

      //  1
      await market.buyTokens(100, 99, {from: accounts[1], value: ether("0.0505")});
      assert.equal(0, (await market.balance.call()).cmp(ether("0.0505")), "wrong balance, should be 0.0505 eth");

      //  2
      await market.buyTokens(100, 99, {from: accounts[1], value: ether("0.1505")});
      assert.equal(0, (await market.balance.call()).cmp(ether("0.0505").add(ether("0.1505"))), "wrong balance, should be 0.0505 + 0.1505 eth");

      //  3
      await market.buyTokens(200, 200, {from: accounts[1], value: ether("0.601")});
      assert.equal(0, (await market.balance.call()).cmp(ether("0.0505").add(ether("0.1505")).add(ether("0.601"))), "wrong balance, should be 0.0505 + 0.1505 + 601 eth");
    });

    it("should return correct balance after sell", async function () {
      await time.increaseTo(SALE_START);
      await token.approve(market.address, ether("1"), {from: accounts[1]});

      let valueBuy = await market.valueToBuyExactTokens.call(45678);
      assert.equal(0, (valueBuy).cmp(ether("10432.62681")), "wrong value, valueBuy should be == 10432.62681 eth");
      await market.buyTokens(45678, 45678, { from: accounts[1], value: valueBuy });
      assert.equal(0, (await market.balance.call()).cmp(valueBuy), "wrong balance, should be 10432.62681 eth");

      //  4567.8 - 4000.0
      let valueSell_1 = await market.valueToSellExactTokens.call(5679);
      assert.equal(0, (valueSell_1).cmp(ether("2432.82681")), "wrong value, valueSell_1 should be == 2432.82681 eth");
      await market.sellTokens(5679, valueSell_1, { from: accounts[1] });
      assert.equal(0, (await market.balance.call()).cmp(valueBuy.sub(valueSell_1)), "wrong value, valueSell_1 should be == valueBuy - valueSell_1 eth");

      //  3999.9 - 3210.4
      let valueSell_2 = await market.valueToSellExactTokens.call(7896);
      assert.equal(0, (valueSell_2).cmp(ether("2846.62644")), "wrong value, valueSell_2 should be == 2846.62644 eth");
      await market.sellTokens(7896, valueSell_2, { from: accounts[1] });
      assert.equal(0, (await market.balance.call()).cmp(valueBuy.sub(valueSell_1).sub(valueSell_2)), "wrong value, valueSell_1 should be == valueBuy - valueSell_1 - valueSell_2 eth");

      //  3210.3 - 1234.5
      let valueSell_3 = await market.valueToSellExactTokens.call(19759);
      assert.equal(0, (valueSell_3).cmp(ether("4391.24016")), "wrong value, valueSell_3 should be == 4391.24016 eth");
      await market.sellTokens(19759, valueSell_3, { from: accounts[1] });
      assert.equal(0, (await market.balance.call()).cmp(valueBuy.sub(valueSell_1).sub(valueSell_2).sub(valueSell_3)), "wrong value, valueSell_1 should be == valueBuy - valueSell_1 - valueSell_2 - valueSell_3 eth");
    });
  });

  describe("kill", function () {
    it("should transfer balance to DEPLOYER", async function () {
      await time.increaseTo(SALE_START);

      await market.buyTokens(100, 99, {from: accounts[1], value: ether("0.0505")});
      assert.equal(0, (await market.balance.call()).cmp(ether("0.0505")), "wrong balance, should be 0.0505 eth");

      let balanceBefore = new BN(await web3.eth.getBalance(DEPLOYER));
      let tx = await market.kill();
      let gasUsed = new BN(tx.receipt.gasUsed);
      let txInfo = await web3.eth.getTransaction(tx.tx);
      let gasPrice = new BN(txInfo.gasPrice);
      let gasSpent = gasUsed.mul(gasPrice);

      let balanceAfter = new BN(await web3.eth.getBalance(DEPLOYER));
      assert.equal(0, balanceBefore.sub(gasSpent).add(ether("0.0505")).cmp(balanceAfter), "wrong balanceAfter");
    });
  });

  describe("addMilestone", function () {
    it("should fail if price for next milestone is less than current token price", async function () {
      await time.increaseTo(SALE_START);
      await market.buyTokens(100, 99, { from: accounts[1], value: ether("0.0505") });
      
      let tokensBought = new BN(await market.tokensBought.call());
      let nextToken = tokensBought.add(new BN("1"));
      let currentPrice = await market.priceForExactToken.call(nextToken);

      let milestoneBurn = await MilestoneBurn.new(market.address, token.address, 20);
      await expectRevert(market.addMilestone(currentPrice.div(new BN("2")), milestoneBurn.address), "wrong price");
    });
  });
});