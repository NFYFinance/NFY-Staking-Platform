pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ownable.sol";

contract NFYStakingNFT is Ownable, ERC721 {
    using SafeMath for uint256;

    // Variable that will keep track of next NFT id
    uint256 public tokenID;

    string public tokenDetails = '{  }';


    // Event that will emit when a token has been minted
    event MintedToken(address _donator, uint256 _tokenId, uint256 _time);

    constructor(address _auditor) Ownable() Auditable(_auditor, address(this)) ERC721() public {}

    function mint(address _minter) public onlyOwner() isAudited() {

        // Mint coin with the next id and send to donator
        _safeMint(_minter, tokenID, '');

        _setTokenURI(tokenID, tokenDetails);

        // Emit event that mint has been processed
        emit MintedToken(_minter, tokenID, now);

        tokenID = tokenID.add(1);
    }

    function updateMetadata(uint256 _tokenID, string memory _metaData) public onlyOwner() isAudited() {
        _setTokenURI(_tokenID, _metaData);
    }

}