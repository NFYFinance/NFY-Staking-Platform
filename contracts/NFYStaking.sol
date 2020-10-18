// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol";
import "./Ownable.sol";

interface IStakingNFT {
    function nftTokenId(address _stakeholder) external view returns(uint id);
    function revertNftTokenId(address _stakeholder, uint _tokenId) external;
}

contract NFYStaking is Ownable {
    using SafeMath for uint256;

    struct NFT {
        address _addressOfMinter;
        address _currentOwner;
        address _previousOwner;
        uint _NFYDeposited;
        bool _inCirculation;
    }

    event StakeCompleted(address _stakeholder, uint _amount, uint _tokenId, uint _time);
    event WithdrawCompleted(address _stakeholder, uint userReceives, uint _tokenId, uint _time);
    // Event that will emit when a token has been minted
    event MintedToken(address _stakeholder, uint256 _tokenId, uint256 _time);


    // uint tokenID;
    IERC20 public NFYToken;
    IStakingNFT public StakingNFT;
    address public rewardPool;
    address taking;

    mapping(uint => NFT) public NFTDetails;

    // Constructor will set the address of NFY token and address of NFY staking NFT
    constructor(address _NFYToken, address _StakingNFT, address _taking, address _rewardPool) Ownable() public {
        NFYToken = IERC20(_NFYToken);
        StakingNFT = IStakingNFT(_StakingNFT);
        taking = _taking;
        rewardPool = _rewardPool;
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
        return (NFTDetails[_tokenId]._addressOfMinter, NFTDetails[_tokenId]._currentOwner, NFTDetails[_tokenId]._NFYDeposited, NFTDetails[_tokenId]._inCirculation);
    }

    // Function that lets user stake NFY
    function stakeNFY(uint _amount) external {
        require(NFYToken.balanceOf(msg.sender) >= _amount, "Do not have enough NFY to stake");
         
        if(StakingNFT.nftTokenId(msg.sender) == 0){
             addStakeholder(msg.sender);
         }
        uint _tokenId = StakingNFT.nftTokenId(msg.sender);
        NFYToken.transferFrom(msg.sender, address(this), _amount);
        NFTDetails[_tokenId]._NFYDeposited = NFTDetails[_tokenId]._NFYDeposited.add(_amount);
        address _stakeholder = msg.sender;
        uint _time = now;
        emit StakeCompleted(_stakeholder, _amount, _tokenId, _time);
    }

    function addStakeholder(address _stakeholder) private {
        taking.call(abi.encodeWithSignature("mint(address)", _stakeholder));
        uint _tokenId = StakingNFT.nftTokenId(msg.sender);
        NFTDetails[_tokenId]._addressOfMinter = _stakeholder;
        NFTDetails[_tokenId]._currentOwner = _stakeholder;
        NFTDetails[_tokenId]._inCirculation = true;
        uint _time = now;
        //Emit event that mint has been processed
        emit MintedToken(_stakeholder, _tokenId, _time);
    }

    // Function that lets user unstake NFY in system. 5% fee that gets redistributed back to reward pool
    function unstakeNFY(uint _tokenId) external {
        require(NFTDetails[StakingNFT.nftTokenId(msg.sender)]._addressOfMinter == msg.sender, "Can not unstake a token you do not have");
        StakingNFT.revertNftTokenId(msg.sender, _tokenId);
        taking.call(abi.encodeWithSignature("burn(uint256)", _tokenId));
        uint amountStaked = NFTDetails[_tokenId]._NFYDeposited;
        uint userReceives = amountStaked.div(100).mul(95);
        uint fee = amountStaked.div(100).mul(5);

        NFTDetails[_tokenId]._currentOwner = 0x000000000000000000000000000000000000dEaD;
        NFTDetails[_tokenId]._previousOwner = msg.sender;
        NFTDetails[_tokenId]._NFYDeposited = 0;
        NFTDetails[_tokenId]._inCirculation = false;

        NFYToken.transfer(msg.sender, userReceives);
        NFYToken.transfer(rewardPool, fee);
        address _stakeholder = msg.sender;
        uint _time = now;

        emit WithdrawCompleted(_stakeholder, userReceives, _tokenId, _time);
    }
    
    // Will increment value of staking NFT when trade occurs
    function incrementNFTValue (uint _tokenId, uint _amount) external onlyPlatform() {
        NFTDetails[_tokenId]._NFYDeposited =  NFTDetails[_tokenId]._NFYDeposited.add(_amount);
    }

    // Will decrement value of staking NFT when trade occurs
    function decrementNFTValue (uint _tokenId, uint _amount) external onlyPlatform() {
        NFTDetails[_tokenId]._NFYDeposited =  NFTDetails[_tokenId]._NFYDeposited.sub(_amount);
    }

}