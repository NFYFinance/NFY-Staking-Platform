// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ownable.sol";

interface IStakingNFT {
    function nftTokenId(address _stakeholder) external view returns(uint id);
    function revertNftTokenId(address _stakeholder, uint _tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function balanceOf(address owner) external view returns (uint256 balance);
}

contract NFYStaking is Ownable {
    using SafeMath for uint256;

    struct NFT {
        address _addressOfMinter;
        //address _currentOwner;
        //address _previousOwner;
        uint _NFYDeposited;
        bool _inCirculation;
    }

    event StakeCompleted(address _staker, uint _amount, uint _tokenId, uint _totalStaked, uint _time);
    event WithdrawCompleted(address _staker, uint _amount, uint _tokenId, uint _time);
    event MintedToken(address _staker, uint256 _tokenId, uint256 _time);

    IERC20 public NFYToken;
    IStakingNFT public StakingNFT;
    address public rewardPool;
    address public taking;

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

/*    // Function that will get the
    function getNFTDetails(uint _tokenId) public view returns(address _addressOfMinter, address _currentOwner, uint _NFYDeposited, bool _inCirculation){
        return (NFTDetails[_tokenId]._addressOfMinter, NFTDetails[_tokenId]._currentOwner, NFTDetails[_tokenId]._NFYDeposited, NFTDetails[_tokenId]._inCirculation);
    }*/

    // Function that lets user stake NFY
    function stakeNFY(uint _amount) public {
        require(_amount > 0, "Can not stake 0 NFY");
        require(NFYToken.balanceOf(msg.sender) >= _amount, "Do not have enough NFY to stake");

        if(StakingNFT.nftTokenId(_msgSender()) == 0 || StakingNFT.balanceOf(_msgSender()) == 0 || StakingNFT.ownerOf(StakingNFT.nftTokenId(_msgSender())) != _msgSender() ){
             addStakeholder(msg.sender);
        }

        NFYToken.transferFrom(msg.sender, address(this), _amount);
        NFTDetails[StakingNFT.nftTokenId(msg.sender)]._NFYDeposited = NFTDetails[StakingNFT.nftTokenId(msg.sender)]._NFYDeposited.add(_amount);
        emit StakeCompleted(msg.sender, _amount, StakingNFT.nftTokenId(msg.sender), NFTDetails[StakingNFT.nftTokenId(msg.sender)]._NFYDeposited, now);
    }

    function addStakeholder(address _stakeholder) private {
      taking.call(abi.encodeWithSignature("mint(address)", _stakeholder));
        NFTDetails[StakingNFT.nftTokenId(msg.sender)]._addressOfMinter = _stakeholder;
        //NFTDetails[StakingNFT.nftTokenId(msg.sender)]._currentOwner = _stakeholder;
        NFTDetails[StakingNFT.nftTokenId(msg.sender)]._inCirculation = true;

    }

    // Function that lets user unstake NFY in system. 5% fee that gets redistributed back to reward pool
    function unstakeNFY(uint _tokenId) public {
        // Require that user is owner of token id
        require(StakingNFT.ownerOf(_tokenId) == _msgSender(), "User is not owner of token");
        //require(StakingNFT.nftTokenId(_msgSender()) == _tokenId, "User is not owner of specified token id");
        require(NFTDetails[_tokenId]._inCirculation == true, "Stake has already been withdrawn");
        //require(NFTDetails[StakingNFT.nftTokenId(msg.sender)]._addressOfMinter == msg.sender, "Can not unstake a token you do not have");

        uint amountStaked = getNFTBalance(_tokenId);
        uint userReceives = amountStaked.div(100).mul(95);
        uint fee = amountStaked.div(100).mul(5);

        //NFTDetails[_tokenId]._currentOwner = 0x000000000000000000000000000000000000dEaD;
        //NFTDetails[_tokenId]._previousOwner = msg.sender;
        NFTDetails[_tokenId]._NFYDeposited = 0;
        NFTDetails[_tokenId]._inCirculation = false;
        StakingNFT.revertNftTokenId(msg.sender, _tokenId);

        taking.call(abi.encodeWithSignature("burn(uint256)", _tokenId));

        NFYToken.transfer(_msgSender(), userReceives);
        NFYToken.transfer(rewardPool, fee);

        emit WithdrawCompleted(_msgSender(), userReceives, _tokenId, now);
    }

    // Will increment value of staking NFT when trade occurs
    function incrementNFTValue (uint _tokenId, uint _amount) public onlyPlatform() {
        NFTDetails[_tokenId]._NFYDeposited =  NFTDetails[_tokenId]._NFYDeposited.add(_amount);
    }

    // Will decrement value of staking NFT when trade occurs
    function decrementNFTValue (uint _tokenId, uint _amount) public onlyPlatform() {
        NFTDetails[_tokenId]._NFYDeposited =  NFTDetails[_tokenId]._NFYDeposited.sub(_amount);
    }

}