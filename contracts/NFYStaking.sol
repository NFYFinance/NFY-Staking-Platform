// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ownable.sol";

interface IStakingNFT {
    function nftTokenId(address _stakeholder) external view returns(uint id);
    function revertNftTokenId(address _stakeholder, uint _tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function balanceOf(address owner) external view returns (uint256 balance);
    function tokenOfOwnerByIndex(address owner, uint256 index) public view override returns (uint256);
}

contract NFYStaking is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct NFT {
        address _addressOfMinter;
        uint _NFYDeposited;
        bool _inCirculation;
        uint _rewardDebt;
    }

    event StakeCompleted(address _staker, uint _amount, uint _tokenId, uint _totalStaked, uint _time);
    event WithdrawCompleted(address _staker, uint _amount, uint _tokenId, uint _time);
    event RewardsClaimed(address _staker, uint _rewardsClaimed, uint _tokenId, uint _time);
    event RewardsCompounded(address _staker, uint _rewardsCompounded, uint _tokenId, uint _totalStaked, uint _time);
    event MintedToken(address _staker, uint256 _tokenId, uint256 _time);

    IERC20 public NFYToken;
    IStakingNFT public StakingNFT;
    address public rewardPool;
    address public staking;
    uint public dailyReward;
    uint public accNfyPerShare;
    uint public lastRewardBlock;

    mapping(uint => NFT) public NFTDetails;

    // Constructor will set the address of NFY token and address of NFY staking NFT
    constructor(address _NFYToken, address _StakingNFT, address _staking, address _rewardPool, uint _dailyReward) Ownable() public {
        NFYToken = IERC20(_NFYToken);
        StakingNFT = IStakingNFT(_StakingNFT);
        staking = _staking;
        rewardPool = _rewardPool;
        lastRewardBlock = block.number;
        setDailyReward(_dailyReward);
        accNfyPerShare = 0;
    }

    // 6500 blocks in average day --- decimals * NFY balance of rewardPool / blocks / 1000 (0.1%) = rewardPerBlock
    function getRewardPerBlock() public view returns(uint) {
        return NFYToken.balanceOf(rewardPool) / 6500 / dailyReward;
    }

    // % of reward pool to be distributed each day. 1000 == 0.1%
    function setDailyReward(uint _dailyReward) public onlyOwner {
        dailyReward = _dailyReward;
    }

    // Function that will get balance of a NFY balance of a certain stake
    function getNFTBalance(uint _tokenId) public view returns(uint _amountStaked) {
        return NFTDetails[_tokenId]._NFYDeposited;
    }

    // Function that will check if a NFY stake NFT in in circulation
    function checkIfNFTInCirculation(uint _tokenId) public view returns(bool _inCirculation) {
        return NFTDetails[_tokenId]._inCirculation;
    }

    // Function that returns NFT's pending rewards
    function pendingRewards(uint _NFT) public view returns(uint) {
        NFT storage nft = NFTDetails[_NFT];

        uint256 tokensInPool = NFYToken.balanceOf(address(this));
        uint256 _accNfyPerShare = accNfyPerShare;

        if (block.number > lastRewardBlock && tokensInPool != 0) {
            uint256 blocksToReward = block.number.sub(lastRewardBlock);
            uint256 nfyReward = blocksToReward.mul(getRewardPerBlock());
            _accNfyPerShare = _accNfyPerShare.add(nfyReward.mul(1e18).div(tokensInPool));
        }

        return nft._NFYDeposited.mul(_accNfyPerShare).div(1e18).sub(nft._rewardDebt);
    }

    /*function displayTotalRewards(uint[] _NFTs) public view returns(uint) {

    }*/

    // Function that updates NFY pool
    function updatePool() public {
        if (block.number <= lastRewardBlock) {
            return;
        }

        uint256 tokensInPool = NFYToken.balanceOf(address(this));
        if (tokensInPool == 0) {
            lastRewardBlock = block.number;
            return;
        }

        uint256 blocksToReward = block.number.sub(lastRewardBlock);

        uint256 nfyReward = blocksToReward.mul(getRewardPerBlock());

        //Approve nfyReward here
        NFYToken.transferFrom(rewardPool, address(this), nfyReward);

        accNfyPerShare = accNfyPerShare.add(nfyReward.mul(1e18).div(tokensInPool));
        lastRewardBlock = block.number;
    }

    // Function that lets user stake NFY
    function stakeNFY(uint _amount) public {
        require(_amount > 0, "Can not stake 0 NFY");
        require(NFYToken.balanceOf(_msgSender()) >= _amount, "Do not have enough NFY to stake");

        updatePool();

        if(StakingNFT.nftTokenId(_msgSender()) == 0 || StakingNFT.balanceOf(_msgSender()) == 0 || StakingNFT.ownerOf(StakingNFT.nftTokenId(_msgSender())) != _msgSender() ){
             addStakeholder(_msgSender());
        }

        NFT storage nft = NFTDetails[StakingNFT.nftTokenId(_msgSender())];

        if(nft._NFYDeposited > 0) {
            uint _pendingRewards = nft._NFYDeposited.mul(accNfyPerShare).div(1e18).sub(nft._rewardDebt);

            if(_pendingRewards > 0) {
                NFYToken.transfer(_msgSender(), _pendingRewards);
                emit RewardsClaimed(_msgSender(), _pendingRewards, StakingNFT.nftTokenId(_msgSender()), now);
            }
        }

        NFYToken.transferFrom(_msgSender(), address(this), _amount);
        nft._NFYDeposited = nft._NFYDeposited.add(_amount);

        nft._rewardDebt = nft._NFYDeposited.mul(accNfyPerShare).div(1e18);

        emit StakeCompleted(_msgSender(), _amount, StakingNFT.nftTokenId(_msgSender()), nft._NFYDeposited, now);

    }

    function addStakeholder(address _stakeholder) private {
      staking.call(abi.encodeWithSignature("mint(address)", _stakeholder));
        NFTDetails[StakingNFT.nftTokenId(_msgSender())]._addressOfMinter = _stakeholder;
        NFTDetails[StakingNFT.nftTokenId(_msgSender())]._inCirculation = true;
    }

    // Function that will allow user to claim rewards
    function claimReward(uint _tokenId) public {
        require(StakingNFT.ownerOf(_tokenId) == _msgSender(), "User is not owner of token");
        require(NFTDetails[_tokenId]._inCirculation == true, "Stake has already been withdrawn");

        updatePool();

        NFT storage nft = NFTDetails[_tokenId];

        uint _pendingRewards = nft._NFYDeposited.mul(accNfyPerShare).div(1e18).sub(nft._rewardDebt);
        require(_pendingRewards > 0, "No rewards to claim!");

        NFYToken.transfer(_msgSender(), _pendingRewards);

        emit RewardsClaimed(_msgSender(), _pendingRewards, _tokenId, now);
    }

    // Function that will add NFY rewards to NFY staking NFT
    function compoundReward(uint _tokenId) public {
        require(StakingNFT.ownerOf(_tokenId) == _msgSender(), "User is not owner of token");
        require(NFTDetails[_tokenId]._inCirculation == true, "Stake has already been withdrawn");

        updatePool();

        NFT storage nft = NFTDetails[_tokenId];

        uint _pendingRewards = nft._NFYDeposited.mul(accNfyPerShare).div(1e18).sub(nft._rewardDebt);
        require(_pendingRewards > 0, "No rewards to compound!");

        nft._NFYDeposited = nft._NFYDeposited.add(_pendingRewards);

        nft._rewardDebt = nft._NFYDeposited.mul(accNfyPerShare).div(1e18);

        emit RewardsCompounded(_msgSender(), _pendingRewards, _tokenId, nft._NFYDeposited, now);
    }

    // Function that lets user unstake NFY in system. 5% fee that gets redistributed back to reward pool
    function unstakeNFY(uint _tokenId) public {
        // Require that user is owner of token id
        require(StakingNFT.ownerOf(_tokenId) == _msgSender(), "User is not owner of token");
        require(NFTDetails[_tokenId]._inCirculation == true, "Stake has already been withdrawn");

        updatePool();

        NFT storage nft = NFTDetails[_tokenId];

        uint _pendingRewards = nft._NFYDeposited.mul(accNfyPerShare).div(1e18).sub(nft._rewardDebt);

        uint amountStaked = getNFTBalance(_tokenId);
        uint userReceives = amountStaked.div(100).mul(95);
        uint totalSending = userReceives.add(_pendingRewards);
        uint fee = totalSending.div(100).mul(5);

        nft._NFYDeposited = 0;
        nft._inCirculation = false;
        StakingNFT.revertNftTokenId(_msgSender(), _tokenId);

        staking.call(abi.encodeWithSignature("burn(uint256)", _tokenId));

        NFYToken.transfer(_msgSender(), userReceives);
        NFYToken.transfer(rewardPool, fee);

        emit WithdrawCompleted(_msgSender(), userReceives, _tokenId, now);
        emit RewardsClaimed(_msgSender(), _pendingRewards, _tokenId, now);
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