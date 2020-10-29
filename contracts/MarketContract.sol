// SPDX-License-Identifier: MIT

pragma solidity 0.7.0;

import "./TestToken.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

/**
 * TODO
 * MarketContract - rename
 * TestToken - rename
 */

/**
  * Flow
  * Deploy Market
  * Deploy Token(_market)
  * Market.setToken(_token)
 */
contract MarketContract is Ownable {
    using SafeMath for uint256;

    TestToken public token;

    uint256 public solidTokenPrice = 500000000 gwei;    // 0.5 ETH
    uint256 public tokensBought = 10;

    modifier onlyCorrectValueToBuyExactTokens(uint256 _tokens) {
        require(msg.value == valueToBuyExactTokens(_tokens), "wrong buy value");
        _;
    }

    modifier onlyZeroAddress(address _address) {
        require(_address == address(0), "must be 0 addr");
        _;
    }

    modifier onlyNonZeroAddress(address _address) {
        require(_address != address(0), "must not be 0 addr");
        _;
    }

    modifier onlyMoreThanZero(uint256 _amount) {
        require(_amount > 0, "must be > 0");
        _;
    }

    event TokensBought(address _purchaser, uint256 _amount);
    event TokensSold(address _seller, uint256 _amount);

    function setToken(TestToken _token) external onlyOwner onlyNonZeroAddress(address(_token)) onlyZeroAddress(address(token)) {
        token = _token;
        require(
            token.balanceOf(address(this)) == 0x581767BA6189C400000,
            "wrong balance"
        );
    }

    /**
      * @dev Buys tokens.
      * @param _tokens Token amount to be bought.
      */
    function buyExactTokens(uint256 _tokens) public payable onlyMoreThanZero(_tokens) onlyCorrectValueToBuyExactTokens(_tokens) {
        token.transfer(msg.sender, _tokens);
        tokensBought = tokensBought.add(_tokens);
        
        emit TokensBought(msg.sender, _tokens);
    }

    /**
      * @dev Calculates msg.value to be received for appropriate amount of bought tokens.
      * @param _tokens Amount of tokens.
      * @return msg.value to be received.
      */
    function valueToBuyExactTokens(uint256 _tokens) public view onlyMoreThanZero(_tokens) returns (uint256) {
        uint256 lastPrice = priceForExactToken(tokensBought.add(_tokens));
        return (priceForCurrentToken().add(lastPrice)).div(uint256(2)).mul(_tokens);
    }

    /**
      * @dev Sells tokens.
      * @param _tokens Token amount to be sold.
      */
    function sellExactTokens(uint256 _tokens) public payable onlyMoreThanZero(_tokens) {
        require(msg.value == valueToSellExactTokens(_tokens), "wrong msg.value");
        tokensBought = tokensBought.minus(_tokens);

        emit TokensSold(msg.sender, _tokens);
    }

    /**
      * @dev Calculates value to be paid for appropriate amount of sold tokens.
      * @param _tokens Amount of tokens.
      * @return Value to be received.
      */
    function valueToSellExactTokens(uint256 _tokens) public view onlyMoreThanZero(_tokens) returns (uint256) {
        uint256 lastPrice = priceForExactToken(tokensBought.minus(_tokens));
        return (priceForCurrentToken().add(lastPrice)).div(uint256(2)).mul(_tokens);
    }

    /**
      * @dev Returns balance of the Smart Contract.
      * @return Balance of the Smart Contract.
      */
    function balance() public view returns (uint256) {
        return address(this).balance;
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
      * @dev Destroyes Smart Contract.
      */
    function kill() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}
