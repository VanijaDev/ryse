// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./TestToken.sol";
import "./aTestToken.sol";
import "./IMilestone.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

/**
  * Flow:
  * deploy aTestToken
  * deploy MilestoneAirdrop
  * transfer all aTestTokens from previous owner to MilestoneAirdrop
 */

contract MilestoneAirdrop is Ownable, IMilestone {
  bool public claimStarted;
  address public _deployer;

  TestToken public token;
  aTestToken public aToken;
  address public marketContract;

  mapping(address => bool) public tokensClaimed;

  event Airdropped(address recipient, uint256 amount);

  constructor(TestToken _token, aTestToken _aToken, address _marketContract) {
    require(address(_token) != address(0), "wrong _token");
    require(address(_aToken) != address(0), "wrong _aToken");
    require(_marketContract != address(0), "wrong _marketContract");

    _deployer = msg.sender;
    token = _token;
    aToken = _aToken;
    marketContract = _marketContract;
  }

  function claimTokens() external {
    require(claimStarted, "not started yet");
    require(!tokensClaimed[msg.sender], "already claimed");
    tokensClaimed[msg.sender] = true;

    uint256 originalTokens = token.balanceOf(msg.sender);
    require(originalTokens > 0, "nothing to claim");

    aToken.transfer(msg.sender, originalTokens);
    emit Airdropped(msg.sender, originalTokens);
  }

  function _kill() private onlyOwner {
    aToken.transfer(owner(), aToken.balanceOf(address(this)));
    selfdestruct(payable(owner()));
  }

  //  IMilestone
  function launchMilestone() public override {
    require(msg.sender == address(marketContract), "wrong sender");
    claimStarted = true;
  }

  function transferTokenOwnership() internal override {
    token.transferOwnership(address(marketContract));
  }
  
  function finishMilestone() public override {
    _kill();
  }
}
