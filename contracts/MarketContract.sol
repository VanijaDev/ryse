// SPDX-License-Identifier: MIT

pragma solidity 0.7.0;

import "./TestToken.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

/**
  * TODO
  * MarketContract - rename
  * TestToken - rename
 */
contract MarketContract {
  using SafeMath for uint256;

  TestToken token;

  constructor() {}

  function setToken(TestToken _token) external {
    require(_token != TestToken(0), "cannt be 0");
    token = _token;
    require(_token.balanceOf(address(this)) == 0xA2A15D09519BE00000, "wrong balance");
  }

  function buyToken(uint256 _buyAmount) public payable {

  }
}
