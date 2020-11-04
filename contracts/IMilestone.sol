// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IMilestone {
    function launchMilestone() public virtual;

    function finishMilestone() public virtual;

    function transferTokenOwnership() internal virtual;
}
