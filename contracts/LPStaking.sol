pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ownable.sol";

contract LPStaking is Ownable {
    using SafeMath for uint256;

    struct NFT {
        address _addressOfMinter;
        address _currentOwner;
        address _previousOwner;
        uint _NFYDeposited;
        bool _inCirculation;
    }

    modifier onlyTradingPlatform() {
        require(msg.sender == tradingPlatform, "Not trading platform");
        _;
    }

    event StakeCompleted(address _staker, uint _amount, uint _tokenId, uint _time);
    event WithdrawCompleted(address _staker, uint _amount, uint _tokenId, uint _time);

    uint currentTokenId;
    IERC20 public LPToken;
    IERC721 public StakingNFT;
    address public rewardPool;
    address public tradingPlatform;

    mapping(uint => NFT) NFTDetails;

    // Constructor will set the address of NFY token and address of NFY staking NFT
    constructor(address _LPToken, address _StakingNFT) Ownable() public {
        LPToken = IERC20(_LPToken);
        StakingNFT = IERC721(_StakingNFT);
    }

    // Function that will get balance of a NFY balance of a certain stake
    function getNFTBalance(uint _tokenId) public view returns(uint _amountStaked) {
        return NFTDetails[_tokenId]._NFYDeposited;
    }

    // Function that will check if a NFY stake NFT in in circulation
    function checkIfNFTInCirculation(uint _tokenId) public view returns(bool _inCirculation) {
        return NFTDetails[_tokenId]._inCirculation;
    }

/*    // Function that will get the
    function getNFTDetails(uint _tokenId) public view returns(address _addressOfMinter, address _currentOwner, uint _NFYDeposited, bool _inCirculation){
        return (NFTDetails[_tokenId]._NFYDeposited, NFTDetails[_tokenId]._currentOwner, NFTDetails[_tokenId]._NFYDeposited, NFTDetails[_tokenId]._inCirculation);
    }*/

    function getNFTValue(uint _tokenId) public view returns(uint _NFYDeposited) {
        return NFTDetails[_tokenId]._NFYDeposited;
    }

    function incrementNFTValue (uint _tokenId, uint _amount) public onlyTradingPlatform() {
        NFTDetails[_tokenId]._NFYDeposited =  NFTDetails[_tokenId]._NFYDeposited.add(_amount);
    }

    function decrementNFTValue (uint _tokenId, uint _amount) public onlyTradingPlatform() {
        NFTDetails[_tokenId]._NFYDeposited =  NFTDetails[_tokenId]._NFYDeposited.sub(_amount);
    }

/*    // Function that lets user stake NFY
    // Once a user stakes their LP token they can not be unstaked, they can trade the rights to the stake
    // on the trading platform once released
    function stakeLP(uint _amount) public {
        require(LPToken.balanceOf((_msgSender()) >= _amount), "Do not have enough LP to stake");

        StakingNFT.call(abi.encodeWithSignature("mint(address)", msg.sender));

        NFTDetails[currentTokenId]._addressOfMinter = msg.sender;
        NFTDetails[currentTokenId]._currentOwner = msg.sender;
        NFTDetails[currentTokenId]._NFYDeposited = _amount;
        NFTDetails[currentTokenId]._inCirculation = true;

        LPToken.transferFrom(msg.sender, address(this), _amount);

        emit StakeCompleted(msg.sender, _amount, currentTokenId, now);

        currentTokenId = currentTokenId.add(1);
    }*/

    function setTradingPlatform(address _tradingPlatform) public onlyOwner() {
        tradingPlatform = _tradingPlatform;
    }



}