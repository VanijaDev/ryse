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
  * Token.transferOwnership(Market)
  * deploy MilestoneBurn
 */
contract MarketContract is MilestoneManager, DistrubutionPeriods {
  using SafeMath for uint256;
    
  TestToken public token;

  uint256 public tokenPrice = 10000 gwei;  //  0.00001 ETH
  uint256 public tokensBought;

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
    * @param _tokensOut Tokens desired to be bought.
    * @param _tokensOutMin Tokens minimum to be bought.
    */
  function buyTokens(uint256 _tokensOut, uint256 _tokensOutMin) public payable onlyMoreThanZero(_tokensOutMin) {
    uint256 nextTokenPrice = priceForExactToken(tokensBought.add(1));
    uint256 lastTokenPrice = priceForExactToken(tokensBought.add(_tokensOut));
    uint256 tokens = msg.value.div((lastTokenPrice.sub(nextTokenPrice)).div(2).add(nextTokenPrice));
    require(tokens >= _tokensOutMin, "less than min");
    
    uint256 validValueForTokens = valueToBuyExactTokens(tokens);
    require(msg.value >= validValueForTokens, "value required < msg.value");
    
    uint256 valueDiff = msg.value.sub(validValueForTokens);
    if (valueDiff > 0) {
      msg.sender.transfer(valueDiff);
    }

    token.transfer(_msgSender(), tokens);
    tokensBought = tokensBought.add(tokens);

    if (shouldLaunchNextMilestone(priceForExactToken(tokensBought))) {
      launchNextMilestone();
    }
    
    emit TokensBought(_msgSender(), tokens, msg.value);
  }

  /**
    * @dev Calculated value to be paid for appropriate amount of bought tokens.
    * @param _tokens Amount of tokens.
    * @return Value to be paid.
    */
  function valueToBuyExactTokens(uint256 _tokens) public view onlyMoreThanZero(_tokens) returns (uint256) {
    uint256 nextTokenPrice = priceForExactToken(tokensBought.add(1));
    uint256 lastTokenPrice = priceForExactToken(tokensBought.add(_tokens));
    
    return (nextTokenPrice.add((lastTokenPrice.sub(nextTokenPrice)).div(2))).mul(_tokens);
  }

   /**
     * @dev Sells tokens.
     * @param _tokens Token amount to be sold.
     * @param _ethOutMin Ether amount min to be received.
     */
   function sellTokens(uint256 _tokens, uint256 _ethOutMin) public onlyMoreThanZero(_tokens) {
     require(token.balanceOf(msg.sender) >= _tokens, "not enough tokens");
     
     uint256 ethOut = valueToSellExactTokens(_tokens);
     require(ethOut >= _ethOutMin, "ethOut < _ethOutMin");
     require(balance() >= ethOut, "not enough balance");
     require(token.allowance(_msgSender(), address(this)) >= _tokens, "amount not allowed");
    
     token.transferFrom(_msgSender(), address(this), _tokens);
     tokensBought = tokensBought.sub(_tokens);
     _msgSender().transfer(ethOut);

     emit TokensSold(_msgSender(), _tokens, ethOut);
   }

   /**
     * @dev Calculates value to be received for appropriate amount of sold tokens.
     * @param _tokens Amount of tokens.
     * @return Value to be received.
     */
   function valueToSellExactTokens(uint256 _tokens) public view onlyMoreThanZero(_tokens) returns (uint256) {
    uint256 currentTokenPrice = priceForExactToken(tokensBought);
    uint256 lastTokenPrice = priceForExactToken(tokensBought.sub(_tokens).add(1));
    
    return (lastTokenPrice.add((currentTokenPrice.sub(lastTokenPrice)).div(2))).mul(_tokens);
   }

  /**
    * @dev Returns price for exact token.
    * @param _token Exact token to get price for.
    * @return Price for exact token.
    */
  function priceForExactToken(uint256 _token) public view returns (uint256) {
    return tokenPrice.mul(_token);
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
  function addMilestone(uint256 _startPrice, address _contractAddress) public override onlyOwner {
    require(_startPrice > priceForExactToken(tokensBought), "wrong price");

    MilestoneManager.addMilestone(_startPrice, _contractAddress);
  }

  /**
    * @dev Launches next milestone.
   */
  function launchNextMilestone() internal override {
    Milestone memory nextMilestone = milestones[currentMilestoneIdx.add(1)];
    if(IMilestone(nextMilestone.contractAddress).requireTokenOwnership()) {
      token.transferOwnership(nextMilestone.contractAddress);
    }
    super.launchNextMilestone();
  }
}