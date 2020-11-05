// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IMilestone {
    /**
     * @dev Implements functional to launch the milestone.
     */
    function launchMilestone() public virtual;

    /**
     * @dev Implements functional to finish the milestone.
     */
    function finishMilestone() public virtual;

    /**
     * @dev ITransfers token ownership after milestone finished.
     */
    function transferTokenOwnership() internal virtual;
}
