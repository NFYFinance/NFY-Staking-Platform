pragma solidity ^0.6.10;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Ownable.sol";

contract LPStakingNFT is Ownable, ERC721 {
    using SafeMath for uint256;

    // Variable that will keep track of next NFT id
    uint256 public tokenID;

    string public tokenDetails = '{  }';

    // Event that will emit when a token has been minted
    event MintedToken(address _staker, uint256 _tokenId, uint256 _time);

    constructor() Ownable() ERC721("NFY/ETH LP Staking NFT", "LPNFT") public {}

    // Will mint LP NFT when a user stakes
    function mint(address _minter) public onlyOwner() {

        _safeMint(_minter, tokenID, '');

        _setTokenURI(tokenID, tokenDetails);

        // Emit event that mint has been processed
        emit MintedToken(_minter, tokenID, now);

        tokenID = tokenID.add(1);
    }

    function updateMetadata(uint256 _tokenID, string memory _metaData) public onlyOwner()  {
        _setTokenURI(_tokenID, _metaData);
    }

}