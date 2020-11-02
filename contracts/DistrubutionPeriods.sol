// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract DistrubutionPeriods is Ownable {
    using SafeMath for uint256;

    uint256 public presaleStart; //  timestamp
    uint256 public saleStart; //  timestamp

    mapping(address => bool) private presaleAllowance; //  addresses, that are allowed to participate in presale

    constructor(uint256 _presaleStart, uint256 _saleStart) {
        _updateSalePeriods(_presaleStart, _saleStart);
    }

    function updateSalePeriods(uint256 _presaleStart, uint256 _saleStart)
        external
        onlyOwner
    {
        _updateSalePeriods(_presaleStart, _saleStart);
    }

    function _updateSalePeriods(uint256 _presaleStart, uint256 _saleStart) private {
        require(_presaleStart > block.timestamp, "worng _presaleStart");
        require(_saleStart > _presaleStart, "worng _saleStart");

        presaleStart = _presaleStart;
        saleStart = _saleStart;
    }

    function allowPresaleFor(address _addr) external onlyOwner {
        require(_addr != address(0), "_addr cannt be 0");

        presaleAllowance[_addr] = true;
    }

    function disallowPresaleFor(address _addr) external onlyOwner {
        require(_addr != address(0), "_addr cannt be 0");

        delete presaleAllowance[_addr];
    }

    function isPresalePeriod() public view returns (bool) {
        return block.timestamp >= presaleStart && block.timestamp < saleStart;
    }

    function isSalePeriod() public view returns (bool) {
        return block.timestamp >= saleStart;
    }

    function isPresaleAllowedFor(address _addr) public view returns (bool) {
        return presaleAllowance[_addr];
    }
}
