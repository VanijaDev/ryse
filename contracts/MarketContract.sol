// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./TestToken.sol";
import "./MilestoneManager.sol";
import "./DistrubutionPeriods.sol";

/**
 * TODO
 * MarketContract - rename
 * TestToken - rename
 */

/**
  * Flow
  * deploy Market
  * deploy Token(_market)
  * Market.setToken(_token)
  * deploy MilestoneBurn
 */
contract MarketContract is MilestoneManager, DistrubutionPeriods {
  using SafeMath for uint256;
    
  TestToken public token;

  uint256 public solidTokenPrice = 500000000 gwei;    // 0.5 ETH
  uint256 public tokensBought = 10;

  modifier onlyMoreThanZero(uint256 _amount) {
    require(_amount > 0, "must be > 0");
    _;
  }

  event TokensBought(address purchaser, uint256 amount, uint256 value);
  event TokensSold(address seller, uint256 amount, uint256 value);
  

  /**
    * @dev Contract constructor.
    * @param _presaleStart Timestamp when presale period starts.
    * @param _saleStart Timestamp when main sale period starts.
    */
  constructor(uint256 _presaleStart, uint256 _saleStart) DistrubutionPeriods(_presaleStart, _saleStart) {}

  /**
    * @dev Sets token to be used.
    * @param _token Token address.
   */
  function setToken(TestToken _token) external onlyOwner {
    require(address(_token) != address(0), "_token cannt be 0");
    require(address(token) == address(0), "token is set");

    token = _token;
    require(token.balanceOf(address(this)) == 0x581767BA6189C400000, "wrong balance");
  }

  /**
    * @dev Buys tokens.
    * @param _tokens Token amount to be bought.
    */
  function buyExactTokens(uint256 _tokens) public payable onlyMoreThanZero(_tokens) {
    if (isPresalePeriod()) {
      require(isPresaleAllowedFor(_msgSender()), "presale not allowed");
    }

    require(isSalePeriod(), "not sale period");
    require(tokensBought.add(_tokens) <= token.totalSupply(), "exceeds totalSupply");
    require(msg.value == valueToBuyExactTokens(_tokens), "wrong buy value");

    token.transfer(_msgSender(), _tokens);
    tokensBought = tokensBought.add(_tokens);

    if (_shouldLaunchNextMilestone(priceForCurrentToken())) {
      launchNextMilestone();
    }
    
    emit TokensBought(_msgSender(), _tokens, msg.value);
  }

  /**
    * @dev Calculates value to be received for appropriate amount of bought tokens.
    * @param _tokens Amount of tokens.
    * @return Value to be received.
    */
  function valueToBuyExactTokens(uint256 _tokens) public view onlyMoreThanZero(_tokens) returns (uint256) {
    uint256 lastTokenPrice = priceForExactToken(tokensBought.add(_tokens));
    return lastTokenPrice.sub(priceForCurrentToken());
  }

  /**
    * @dev Sells tokens.
    * @param _tokens Token amount to be sold.
    */
  function sellExactTokens(uint256 _tokens) public onlyMoreThanZero(_tokens) {
    uint256 transferValue = valueToSellExactTokens(_tokens);
    require(balance() >= transferValue, "not enough balance");
    require(token.allowance(_msgSender(), address(this)) >= _tokens, "amount not allowed");
    
    token.transferFrom(_msgSender(), address(this), _tokens);
    tokensBought = tokensBought.sub(_tokens);
    _msgSender().transfer(transferValue);

    emit TokensSold(_msgSender(), _tokens, transferValue);
  }

  /**
    * @dev Calculates value to be paid for appropriate amount of sold tokens.
    * @param _tokens Amount of tokens.
    * @return Value to be received.
    */
  function valueToSellExactTokens(uint256 _tokens) public view onlyMoreThanZero(_tokens) returns (uint256) {
    uint256 lastTokenPrice = priceForExactToken(tokensBought.sub(_tokens));
    return priceForCurrentToken().sub(lastTokenPrice);
  }

  /**
    * @dev Returns price for the next token.
    * @return price for the next token.
    */
  function priceForCurrentToken() public view returns (uint256) {
    return solidTokenPrice.mul(tokensBought.add(1)).div(1 ether);
  }

  /**
    * @dev Returns price for exact token.
    * @param _token Exact token to get price for.
    * @return Price for exact token.
    */
  function priceForExactToken(uint256 _token) public view returns (uint256) {
    return solidTokenPrice.mul(_token).div(1 ether);
  }

  /**
    * @dev Returns balance of this Smart Contract.
    * @return Balance of this Smart Contract.
    */
  function balance() public view returns (uint256) {
    return address(this).balance;
  }

  /**
    * @dev Destroys this Smart Contract.
    */
  function kill() external onlyOwner {
    selfdestruct(payable(owner()));
  }

  /**
    * @dev Adds milestone.
    * @param _startPrice Price for milestone to start.
    * @param _contractAddress Milestone Smart Contract address.
   */
  function addMilestone(uint256 _startPrice, address _contractAddress) internal override onlyOwner {
    require(_startPrice > priceForCurrentToken(), "wrong price");

    MilestoneManager.addMilestone(_startPrice, _contractAddress);
  }

  /**
    * @dev Launches next milestone.
   */
  function launchNextMilestone() private {
    currentMilestoneIdx = currentMilestoneIdx.add(1);
    Milestone memory nextMilestone = milestones[currentMilestoneIdx];
    token.transferOwnership(nextMilestone.contractAddress);
    nextMilestone.launchMilestone();
  }
}
