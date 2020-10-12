pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ownable.sol";

contract NFYStaking is Ownable {
    using SafeMath for uint256;

    struct NFT {
        address _addressOfMinter;
        address _currentOwner;
        address _previousOwner;
        uint _NFYDeposited;
        bool _inCirculation;
    }

    event StakeCompleted(address _staker, uint _amount, uint _tokenId, uint _time);
    event WithdrawCompleted(address _staker, uint _amount, uint _tokenId, uint _time);

    uint currentTokenId;
    IERC20 public NFYToken;
    IERC721 public StakingNFT;
    address public rewardPool;

    mapping(uint => NFT) NFTDetails;

    // Constructor will set the address of NFY token and address of NFY staking NFT
    constructor(address _NFYToken, address _StakingNFT) Ownable() {
        NFYToken = IERC20(_NFYToken);
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

    // Function that will get the
    function getNFTDetails(uint _tokenId) public view returns(address _addressOfMinter, address _currentOwner, uint _NFYDeposited, bool _inCirculation){
        return (NFTDetails[_tokenId]._NFYDeposited, NFTDetails[_tokenId]._currentOwner, NFTDetails[_tokenId]._NFYDeposited, NFTDetails[_tokenId]._inCirculation);
    }

    // Function that lets user stake NFY
    function stakeNFY(uint _amount) public {
        require(NFYToken.balanceOf((msg.sender) >= _amount), "Do not have enough NFY to stake");

        StakingNFT.call(abi.encodeWithSignature("mint(address)", msg.sender));

        NFTDetails[currentTokenId]._addressOfMinter = msg.sender;
        NFTDetails[currentTokenId]._currentOwner = msg.sender;
        NFTDetails[currentTokenId]._NFYDeposited = _amount;
        NFTDetails[currentTokenId]._inCirculation = true;

        NFYToken.transferFrom(msg.sender, address(this), _amount);

        emit StakeCompleted(msg.sender, _amount, currentTokenId, now);

        currentTokenId = currentTokenId.add(1);

    }

    // Function that lets user unstake NFY in system. 5% fee that gets redistributed back to reward pool
    function unstakeNFY(uint _tokenId) public {
        require(StakingNFT.ownerOf(_tokenId) == msg.sender, "Can not unstake a token you do not have");

        uint amountStaked = NFTDetails[_tokenId]._NFYDeposited;
        uint userReceives = amountStaked.div(100).mul(95);
        uint fee = amountStaked.div(100).mul(5);

        NFTDetails[_tokenId]._currentOwner = 0x000000000000000000000000000000000000dEaD;
        NFTDetails[_tokenId]._previousOwner = msg.sender;
        NFTDetails[_tokenId]._NFYDeposited = 0;
        NFTDetails[_tokenId]._inCirculation = false;

        NFYToken.transfer(msg.sender, userReceives);
        NFYToken.transfer(rewardPool, fee);

        STakingNFT.transferFrom(msg.sender, 0x000000000000000000000000000000000000dEaD, _tokenId);

        emit WithdrawCompleted(msg.sender, userReceives, _tokenId, now);

    }

}