// SPDX-License-Identifier: MIT

pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ownable.sol";

contract NFYStakingNFT is Ownable, ERC721 {
    using SafeMath for uint256;

    // Variable that will keep track of next NFT id
    uint256 public tokenID;

    mapping(address => uint) public nftId;

    // Event that will emit when a token has been minted
    event MintedToken(address _staker, uint256 _tokenId, uint256 _time);

    constructor() Ownable() ERC721("NFY Staking NFT", "NFYNFT") public {}

    // Will mint NFY NFT when a user stakes
    function mint(address _minter) external onlyPlatform() {
        tokenID = tokenID.add(1);
        _safeMint(_minter, tokenID, '');
        nftId[_minter] = tokenID;
        
        // Emit event that mint has been processed
        emit MintedToken(_minter, tokenID, now);
    }
    
    function revertNftTokenId(address _stakeholder, uint _tokenId) external {
        //require(_msgSender() == _stakeholder, "User is not passed in address");
        require(nftId[_stakeholder] == _tokenId, "Can not revert a token you do not have to zero");
        nftId[_stakeholder] = 0;
    }
    
    function nftTokenId(address _stakeholder) external view returns(uint id){
       return nftId[_stakeholder];
    }
    
     function burn(uint256 _token) external onlyPlatform() {
        _burn(_token);
    }

}