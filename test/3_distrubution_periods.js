const MarketContract = artifacts.require("MarketContract");

const { BN, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

contract("DistrubutionPeriods", function (accounts) {
  const DEPLOYER = accounts[0];
  const ADDR_FOR_PRESALE = accounts[1];

  let PRESALE_START;
  let SALE_START;
  
  let market;

  beforeEach("deploy contract", async function () {
    await time.advanceBlock();

    PRESALE_START = ((await time.latest()).add(time.duration.seconds(1)));
    SALE_START = ((await time.latest()).add(time.duration.minutes(1)));

    market = await MarketContract.new(PRESALE_START, SALE_START);
  });

  describe("constructor, updateSalePeriods, _updateSalePeriods", function () {
    it("should fail if presale was in past", async function () {
      PRESALE_START = (await time.latest()).sub(time.duration.seconds(1));
      await expectRevert(MarketContract.new(PRESALE_START, SALE_START), "worng _presaleStart");
    });

    it("should fail if presale is now", async function () {
      PRESALE_START = (await time.latest());
      await expectRevert(MarketContract.new(PRESALE_START, SALE_START), "worng _presaleStart");
    });

    it("should fail if sale was before presale", async function () {
      SALE_START = (await time.latest()).sub(time.duration.minutes(1));
      await expectRevert(MarketContract.new(PRESALE_START, SALE_START), "worng _saleStart");
    });

    it("should set correct presaleStart", async function () {
      assert.equal(0, (new BN(PRESALE_START)).cmp(await market.presaleStart.call()), "wrong presaleStart");
    });
    
    it("should set correct saleStart", async function () {
      assert.equal(0, (new BN(SALE_START)).cmp(await market.saleStart.call()), "wrong saleStart");
    });
  });

  describe("allowPresaleFor, isPresaleAllowedFor", async function () {
    it("should fail is not owner", async function () {
      await expectRevert(market.allowPresaleFor(ADDR_FOR_PRESALE, { from:ADDR_FOR_PRESALE }), "caller is not the owner");
    });
    
    it("should fail is address == 0", async function () {
      await expectRevert(market.allowPresaleFor("0x0000000000000000000000000000000000000000"), "_addr cannt be 0");
    });

    it("should set presaleAllowance for address", async function () {
      assert.isFalse(await market.isPresaleAllowedFor.call(ADDR_FOR_PRESALE), "should be false before");
      await market.allowPresaleFor(ADDR_FOR_PRESALE);
      assert.isTrue(await market.isPresaleAllowedFor.call(ADDR_FOR_PRESALE), "should be true after");
    });
  });

  describe("disallowPresaleFor, isPresaleAllowedFor", async function () {
    it("should fail is not owner", async function () {
      await expectRevert(market.disallowPresaleFor(ADDR_FOR_PRESALE, { from:ADDR_FOR_PRESALE }), "caller is not the owner");
    });
    
    it("should fail is address == 0", async function () {
      await expectRevert(market.disallowPresaleFor("0x0000000000000000000000000000000000000000"), "_addr cannt be 0");
    });

    it("should remove presaleAllowance for address", async function () {
      assert.isFalse(await market.isPresaleAllowedFor.call(ADDR_FOR_PRESALE), "should be false before");
      await market.allowPresaleFor(ADDR_FOR_PRESALE);
      assert.isTrue(await market.isPresaleAllowedFor.call(ADDR_FOR_PRESALE), "should be true after");

      await market.disallowPresaleFor(ADDR_FOR_PRESALE);
      assert.isFalse(await market.isPresaleAllowedFor.call(ADDR_FOR_PRESALE), "should be false after");
    });
  });

  describe("isPresalePeriod", async function () {
    it("should return false if before presaleStart", async function () {
      PRESALE_START = ((await time.latest()).add(time.duration.seconds(10)));
      SALE_START = ((await time.latest()).add(time.duration.minutes(1)));
      market = await MarketContract.new(PRESALE_START, SALE_START);

      assert.isFalse(await market.isPresalePeriod.call(), "should be false");
    });

    it("should return false if after saleStart", async function () {
      PRESALE_START = ((await time.latest()).add(time.duration.seconds(10)));
      SALE_START = ((await time.latest()).add(time.duration.minutes(1)));
      market = await MarketContract.new(PRESALE_START, SALE_START);

      await time.increase(time.duration.minutes(2));

      assert.isFalse(await market.isPresalePeriod.call(), "should be false");
    });

    it("should return true is presaleStart is current", async function () {
      PRESALE_START = ((await time.latest()).add(time.duration.seconds(10)));
      SALE_START = ((await time.latest()).add(time.duration.minutes(1)));
      market = await MarketContract.new(PRESALE_START, SALE_START);

      await time.increase(time.duration.seconds(20));

      assert.isTrue(await market.isPresalePeriod.call(), "should be true");
    });
  });

  describe("isSalePeriod", async function () {
    it("should return false if before saleStart", async function () {
      PRESALE_START = ((await time.latest()).add(time.duration.seconds(10)));
      SALE_START = ((await time.latest()).add(time.duration.minutes(1)));
      market = await MarketContract.new(PRESALE_START, SALE_START);

      assert.isFalse(await market.isSalePeriod.call(), "should be false");

      await time.increase(time.duration.seconds(20));
      assert.isFalse(await market.isSalePeriod.call(), "should be false");
    });

    it("should return true is saleStart is current", async function () {
      PRESALE_START = ((await time.latest()).add(time.duration.seconds(10)));
      SALE_START = ((await time.latest()).add(time.duration.minutes(1)));
      market = await MarketContract.new(PRESALE_START, SALE_START);

      await time.increase(time.duration.minutes(2));

      assert.isTrue(await market.isSalePeriod.call(), "should be true");
    });
  });
});