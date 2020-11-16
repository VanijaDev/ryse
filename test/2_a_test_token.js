const aTestToken = artifacts.require("aTestToken");

const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

contract("aTestToken", function (accounts) {
  const TOTAL_SUPPLY = 300000;

  let aToken;

  beforeEach("deploy contract", async function () {
    aToken = await aTestToken.new(TOTAL_SUPPLY);
  });

  describe("constructor", function () {
    it("should fail if totalSupply == 0", async function () {
      await expectRevert(aTestToken.new(0), "wrong totalSupply");
    });

    it("should validate _totalSupply is as provided", async function () {
      assert.equal(0, (await aToken.totalSupply.call()).cmp(new BN(TOTAL_SUPPLY)), "wrong _totalSupply assigned");
    });

    it("should set _totalSupply to deployer", async function () {
      assert.equal(0, (await aToken.totalSupply.call()).cmp(await aToken.balanceOf(await aToken.owner.call())), "wrong owner balance");
    });
  });

});