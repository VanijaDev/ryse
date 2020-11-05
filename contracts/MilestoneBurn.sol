// SPDX-License-Identifier: MIT

import "./MarketContract.sol";
import "./IMilestone.sol";
import "./TestToken.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

pragma solidity ^0.7.0;

contract MilestoneBurn is IMilestone {
  using SafeMath for uint256;

  uint256 public burnPercent;
  address public deployer;

  MarketContract public marketContract;
  TestToken public token;

  /**
    * @dev Contract constructor.
    * @param _marketContract Address for market Smart Contract.
    * @param _token Basic token address.
    * @param _burnPercent Token percentage to be burned.
    */
  constructor(MarketContract _marketContract, TestToken _token, uint256 _burnPercent) {
    require(address(_marketContract) != address(0), "wrong _marketContract");
    require(address(_token) != address(0), "wrong _token");
    require(_burnPercent > 0 && _burnPercent < 100, "wrong _burnPercentage");

    burnPercent = _burnPercent;
    deployer = msg.sender;
    marketContract = _marketContract;
    token = _token;
  }


  //  IMilestone
  function launchMilestone() public override {
    require(msg.sender == address(marketContract), "wrong sender L");
    require(token.owner() == address(this), "not token owner");

    uint256 tokenSupplyToBurn = token.balanceOf(address(marketContract)).div(100).mul(burnPercent);
    token.burn(msg.sender, tokenSupplyToBurn);

    transferTokenOwnership();
    finishMilestone();
  }

  function transferTokenOwnership() internal override {
    token.transferOwnership(address(marketContract));
  }
  
  function finishMilestone() public override {
    require(msg.sender == address(marketContract), "wrong sender F");
    selfdestruct(payable(deployer));
  }
}
