// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

contract MilestoneManager is Ownable {
  using SafeMath for uint256;

  struct Milestone {
    uint256 startPrice;
    address contractAddress;
    bool activated;
  }

  uint256 public currentMilestoneIdx;
  uint256 public milestoneCount;
  mapping (uint256 => Milestone) internal milestones;

  constructor() {
    milestones[milestoneCount] = Milestone(0, address(0), true);  //  first one is default
    milestoneCount = milestoneCount.add(1);
  }

  function milestoneAtIdx(uint256 _idx) public view returns (uint256 startPrice, address contractAddress, bool activated) {
    startPrice = milestones[_idx].startPrice;
    contractAddress = milestones[_idx].contractAddress;
    activated = milestones[_idx].activated;
  }

  function addMilestone(uint256 _startPrice, address _contractAddress) internal virtual onlyOwner {
    require(_startPrice > 0, "_startPrice cannt be 0");
    require(_contractAddress != address(0), "_contractAddress cannt be 0");
    require(_startPrice > milestones[milestoneCount.sub(1)].startPrice, "startPrice is less, than last");

    milestones[milestoneCount] = Milestone(_startPrice, _contractAddress, false);
    milestoneCount = milestoneCount.add(1);
  }

  function _shouldLaunchNextMilestone(uint256 _currentPrice) internal view returns(bool) {  //  TODO: check for current price
    Milestone memory nextMilestone = milestones[currentMilestoneIdx.add(1)];
    return (_currentPrice >= nextMilestone.startPrice && !nextMilestone.activated);
  }
}
