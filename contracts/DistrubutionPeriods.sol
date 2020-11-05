// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract DistrubutionPeriods is Ownable {
  using SafeMath for uint256;

  uint256 public presaleStart; //  timestamp
  uint256 public saleStart; //  timestamp

  mapping(address => bool) private presaleAllowance; //  addresses, that are allowed to participate in presale

    /**
      * @dev Contract constructor.
      * @param _presaleStart Timestamp when presale period starts.
      * @param _saleStart Timestamp when main sale period starts.
     */
    constructor(uint256 _presaleStart, uint256 _saleStart) {
        _updateSalePeriods(_presaleStart, _saleStart);
    }

    /**
      * @dev Updates periods for presale and main sale, public method.
      * @param _presaleStart Timestamp when presale period starts.
      * @param _saleStart Timestamp when main sale period starts.
     */
    function updateSalePeriods(uint256 _presaleStart, uint256 _saleStart) external onlyOwner {
        _updateSalePeriods(_presaleStart, _saleStart);
    }

    /**
      * @dev Updates periods for presale and main sale, private method.
      * @param _presaleStart Timestamp when presale period starts.
      * @param _saleStart Timestamp when main sale period starts.
     */
    function _updateSalePeriods(uint256 _presaleStart, uint256 _saleStart) private {
        require(_presaleStart > block.timestamp, "worng _presaleStart");
        require(_saleStart > _presaleStart, "worng _saleStart");

        presaleStart = _presaleStart;
        saleStart = _saleStart;
    }

    /**
      * @dev Allows address to participate in presale.
      * @param _addr Address to be allowed.
     */
    function allowPresaleFor(address _addr) external onlyOwner {
        require(_addr != address(0), "_addr cannt be 0");

        presaleAllowance[_addr] = true;
    }

    /**
      * @dev Disallows address to participate in presale.
      * @param _addr Address to be disallowed.
     */
    function disallowPresaleFor(address _addr) external onlyOwner {
        require(_addr != address(0), "_addr cannt be 0");

        delete presaleAllowance[_addr];
    }

    /**
      * @dev Checks if presale period is going.
      * @return Weather presale period is going.
     */
    function isPresalePeriod() public view returns (bool) {
        return block.timestamp >= presaleStart && block.timestamp < saleStart;
    }

    /**
      * @dev Checks if main sale period is going.
      * @return Weather main sale period is going.
     */
    function isSalePeriod() public view returns (bool) {
        return block.timestamp >= saleStart;
    }

    /**
      * @dev Checks if address is allowed to participate in presale.
      * @param _addr Address to be checked.
      * @return Weather address is allowed to participate in presale.
     */
    function isPresaleAllowedFor(address _addr) public view returns (bool) {
        return presaleAllowance[_addr];
    }
}
