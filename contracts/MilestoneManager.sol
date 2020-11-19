// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./IMilestone.sol";
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

  event MilestoneLaunched(address milestone);

  /**
    * @dev Contract constructor.
    */
  constructor() {
    milestones[milestoneCount] = Milestone(0, address(0), true);  //  first one is default sale
    milestoneCount = milestoneCount.add(1);
  }

  /**
    * @dev Returns milestone data at index.
    * @param _idx Milestone index.
    * @return startPrice StartPrice data at index.
    * @return contractAddress cCntractAddress data at index.
    * @return activated Activated data at index.
    */
  function milestoneAtIdx(uint256 _idx) public view returns (uint256 startPrice, address contractAddress, bool activated) {
    startPrice = milestones[_idx].startPrice;
    contractAddress = milestones[_idx].contractAddress;
    activated = milestones[_idx].activated;
  }

  /**
    * @dev Adds milestone.
    * @param _startPrice Price for milestone to start.
    * @param _contractAddress Milestone Smart Contract address.
   */
  function addMilestone(uint256 _startPrice, address _contractAddress) public virtual onlyOwner {
    require(_contractAddress != address(0), "_contractAddress cannt be 0");
    require(_startPrice > milestones[milestoneCount.sub(1)].startPrice, "startPrice is less, than last");

    milestones[milestoneCount] = Milestone(_startPrice, _contractAddress, false);
    milestoneCount = milestoneCount.add(1);
  }

  /**
    * @dev Checks if next milestone should be launched.
    * @param _currentPrice Token price on a curve.
    * @return Weather next milestone should be launched.
   */
  function shouldLaunchNextMilestone(uint256 _currentPrice) internal view returns(bool) {
    if (currentMilestoneIdx.add(1) < milestoneCount) {
      Milestone memory nextMilestone = milestones[currentMilestoneIdx.add(1)];
      return (_currentPrice >= nextMilestone.startPrice && !nextMilestone.activated);
    }
  }
  
  /**
    * @dev Launches next milestone.
   */
  function launchNextMilestone() internal virtual {
    currentMilestoneIdx = currentMilestoneIdx.add(1);
    Milestone storage nextMilestone = milestones[currentMilestoneIdx];
    nextMilestone.activated = true;
    IMilestone(nextMilestone.contractAddress).launchMilestone();

    emit MilestoneLaunched(nextMilestone.contractAddress);
  }
}
