// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../node_modules/@openzeppelin/contracts/GSN/Context.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * TODO:
 * contract TestToken - set correct name
 * _name - set correct name
 * _symbol - set correct symbol
 * _totalSupply - set corect value
 * constructor - set correct balances
 */

contract TestToken is Context, Ownable, IERC20 {
  using SafeMath for uint256;

  mapping (address => uint256) private _balances;

  mapping (address => mapping (address => uint256)) private _allowances;

  uint256 private _totalSupply = 0x65A4DA25D3016C00000;  //  30,000

  string constant private _name = "TokenName";
  string constant private _symbol = "TTTT";
  uint8 constant private _decimals = 18;

  event BurnTokens(uint256 tokens);

  /**
    * @dev Smart Contract constructor.
    * @param _market Address of market Smart Contract.
    */
  constructor (address _market) {
    require(_market != address(0), "cannt be 0");

    _balances[0xdD870fA1b7C4700F2BD7f44238821C26f7392148] = 0x3635C9ADC5DEA00000;  //  team_1                == 1,000
    _balances[0x583031D1113aD414F02576BD6afaBfb302140225] = 0x3635C9ADC5DEA00000;  //  team_2                == 1,000
    _balances[0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB] = 0x3635C9ADC5DEA00000;  //  team_3                == 1,000
    _balances[0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C] = 0x3635C9ADC5DEA00000;  //  marketing             == 1,000
    _balances[_market] = 0x581767BA6189C400000;                                             //  market Smart Contract == 26,000
    require(_balances[0xdD870fA1b7C4700F2BD7f44238821C26f7392148]
            .add(_balances[0x583031D1113aD414F02576BD6afaBfb302140225])
            .add(_balances[0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB])
            .add(_balances[0x14723A09ACff6D2A60DcdF7aA4AFf308FDDC160C])
            .add(_balances[_market]) == 0x65A4DA25D3016C00000, "wrong balances");
  }

  /**
    * @dev Returns the name of the token.
    */
  function name() public pure returns (string memory) {
    return _name;
  }

  /**
    * @dev Returns the symbol of the token, usually a shorter version of the
    * name.
    */
  function symbol() public pure returns (string memory) {
    return _symbol;
  }

  /**
    * @dev Returns the number of decimals used to get its user representation.
    * For example, if `decimals` equals `2`, a balance of `505` tokens should
    * be displayed to a user as `5,05` (`505 / 10 ** 2`).
    *
    * Tokens usually opt for a value of 18, imitating the relationship between
    * Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
    * called.
    *
    * NOTE: This information is only used for _display_ purposes: it in
    * no way affects any of the arithmetic of the contract, including
    * {IERC20-balanceOf} and {IERC20-transfer}.
    */
  function decimals() public pure returns (uint8) {
    return _decimals;
  }

  /**
    * @dev See {IERC20-totalSupply}.
    */
  function totalSupply() public view override returns (uint256) {
    return _totalSupply;
  }

  /**
    * @dev See {IERC20-balanceOf}.
    */
  function balanceOf(address account) public view override returns (uint256) {
    return _balances[account];
  }

  /**
    * @dev See {IERC20-transfer}.
    *
    * Requirements:
    *
    * - `recipient` cannot be the zero address.
    * - the caller must have a balance of at least `amount`.
    */
  function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
    _transfer(_msgSender(), recipient, amount);
    return true;
  }

  /**
    * @dev See {IERC20-allowance}.
    */
  function allowance(address owner, address spender) public view virtual override returns (uint256) {
    return _allowances[owner][spender];
  }

  /**
    * @dev See {IERC20-approve}.
    *
    * Requirements:
    *
    * - `spender` cannot be the zero address.
    */
  function approve(address spender, uint256 amount) public virtual override returns (bool) {
    _approve(_msgSender(), spender, amount);
    return true;
  }

  /**
    * @dev See {IERC20-transferFrom}.
    *
    * Emits an {Approval} event indicating the updated allowance. This is not
    * required by the EIP. See the note at the beginning of {ERC20}.
    *
    * Requirements:
    *
    * - `sender` and `recipient` cannot be the zero address.
    * - `sender` must have a balance of at least `amount`.
    * - the caller must have allowance for ``sender``'s tokens of at least
    * `amount`.
    */
  function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
    _transfer(sender, recipient, amount);
    _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
    return true;
  }

  /**
    * @dev Atomically increases the allowance granted to `spender` by the caller.
    *
    * This is an alternative to {approve} that can be used as a mitigation for
    * problems described in {IERC20-approve}.
    *
    * Emits an {Approval} event indicating the updated allowance.
    *
    * Requirements:
    *
    * - `spender` cannot be the zero address.
    */
  function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
    _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
    return true;
  }

  /**
    * @dev Atomically decreases the allowance granted to `spender` by the caller.
    *
    * This is an alternative to {approve} that can be used as a mitigation for
    * problems described in {IERC20-approve}.
    *
    * Emits an {Approval} event indicating the updated allowance.
    *
    * Requirements:
    *
    * - `spender` cannot be the zero address.
    * - `spender` must have allowance for the caller of at least
    * `subtractedValue`.
    */
  function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
    _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
    return true;
  }

  /**
    * @dev Moves tokens `amount` from `sender` to `recipient`.
    *
    * This is internal function is equivalent to {transfer}, and can be used to
    * e.g. implement automatic token fees, slashing mechanisms, etc.
    *
    * Emits a {Transfer} event.
    *
    * Requirements:
    *
    * - `sender` cannot be the zero address.
    * - `recipient` cannot be the zero address.
    * - `sender` must have a balance of at least `amount`.
    */
  function _transfer(address sender, address recipient, uint256 amount) internal virtual {
    require(sender != address(0), "ERC20: transfer from the zero address");
    require(recipient != address(0), "ERC20: transfer to the zero address");

    _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
    _balances[recipient] = _balances[recipient].add(amount);
    emit Transfer(sender, recipient, amount);
  }

  /**
    * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
    *
    * This internal function is equivalent to `approve`, and can be used to
    * e.g. set automatic allowances for certain subsystems, etc.
    *
    * Emits an {Approval} event.
    *
    * Requirements:
    *
    * - `owner` cannot be the zero address.
    * - `spender` cannot be the zero address.
    */
  function _approve(address owner, address spender, uint256 amount) internal virtual {
    require(owner != address(0), "ERC20: approve from the zero address");
    require(spender != address(0), "ERC20: approve to the zero address");

    _allowances[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }

  /**
    * @dev Burs tokens from totalSupply and passed address.
   */  
  function burn(address _address, uint256 _tokens) public onlyOwner {
    require(_balances[_address] >= _tokens, "not enough tokens");
    
    _balances[_address] = _balances[_address].sub(_tokens);
    _totalSupply = _totalSupply.sub(_tokens);

    emit BurnTokens(_tokens);
  }
}
