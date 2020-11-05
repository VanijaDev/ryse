// SPDX-License-Identifier: MIT

import "./MarketContract.sol";
import "./IMilestone.sol";
import "./TestToken.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

pragma solidity ^0.7.0;

contract MilestoneBurn is IMilestone {
  using SafeMath for uint256;

  uint256 public _burnPercent;
  address public _deployer;

  MarketContract public marketContract;
  TestToken public token;

  /**
    * @dev Contract constructor.
    * @param _marketContract Address for market Smart Contract.
    * @param _token Basic token address.
    * @param _burnPercentage Token percentage to be burned.
    */
  constructor(MarketContract _marketContract, TestToken _token, uint256 _burnPercentage) {
    require(address(_marketContract) != address(0), "wrong _marketContract");
    require(address(_token) != address(0), "wrong _token");
    require(_burnPercentage > 0 && _burnPercentage < 100, "wrong _burnPercentage");

    _deployer = msg.sender;
    marketContract = _marketContract;
    token = _token;
  }


  //  IMilestone
  function launchMilestone() public override {
    require(msg.sender == address(marketContract), "wrong sender");
    require(token.owner() == address(this), "not token owner");

    uint256 tokenSupplyToBurn = token.totalSupply().sub(marketContract.tokensBought()).div(100).mul(_burnPercent);
    token.burn(msg.sender, tokenSupplyToBurn);

    transferTokenOwnership();
    finishMilestone();
  }

  function transferTokenOwnership() internal override {
    token.transferOwnership(address(marketContract));
  }
  
  function finishMilestone() public override {
    require(msg.sender == address(this), "wrong sender");
    selfdestruct(payable(_deployer));
  }
}
