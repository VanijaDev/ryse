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
  address public marketContractAddress;

  mapping(address => bool) public tokensClaimed;

  event Airdropped(address recipient, uint256 amount);

  /**
    * @dev Contract constructor.
    * @param _token Basic token address.
    * @param _aToken Token for airdrop address.
    * @param _marketContractAddress Address for market Smart Contract.
    */
  constructor(TestToken _token, aTestToken _aToken, address _marketContractAddress) {
    require(address(_token) != address(0), "wrong _token");
    require(address(_aToken) != address(0), "wrong _aToken");
    require(_marketContractAddress != address(0), "wrong _marketContractAddress");

    _deployer = msg.sender;
    token = _token;
    aToken = _aToken;
    marketContractAddress = _marketContractAddress;
  }

  /**
    * @dev Claims tokens for airdrop.
   */
  function claimTokens() external {
    require(claimStarted, "not started yet");
    require(!tokensClaimed[msg.sender], "already claimed");
    tokensClaimed[msg.sender] = true;

    uint256 originalTokens = token.balanceOf(msg.sender);
    require(originalTokens > 0, "nothing to claim");

    aToken.transfer(msg.sender, originalTokens);
    emit Airdropped(msg.sender, originalTokens);
  }

  /**
    * @dev Destroys this Smart Contract.
    */
  function _kill() private {
    aToken.transfer(owner(), aToken.balanceOf(address(this)));
    selfdestruct(payable(owner()));
  }

  /**
    * IMilestone 
   */
  function launchMilestone() public override {
    require(msg.sender == marketContractAddress, "wrong sender");
    require(token.owner() == marketContractAddress, "wrong token owner");
    
    claimStarted = true;
    transferTokenOwnership();
  }

  function transferTokenOwnership() internal override {
  }
  
  function finishMilestone() public onlyOwner override {
    _kill();
  }
}
