pragma solidity ^0.6.10;
import "@openzeppelin/contracts/GSN/Context.sol";

contract Ownable is Context {

    address payable public owner;

    event TransferredOwnership(address _previous, address _next, uint256 _time);
    event AddedPlatformAddress(address _platformAddress, uint256 _time);
    event RemovedPlatformAddress(address _platformAddress, uint256 _time);

    modifier onlyOwner() {
        require(_msgSender() == owner, "Owner only");
        _;
    }

    modifier onlyPlatform() {
        require(platformAddress[_msgSender()] == true, "Only Platform");
        _;
    }

    mapping(address => bool) platformAddress;

    constructor() public {
        owner = _msgSender();
    }

    // Function to transfer ownership
    function transferOwnership(address payable _owner) public onlyOwner() {
        address previousOwner = owner;
        owner = _owner;
        emit TransferredOwnership(previousOwner, owner, now);
    }

    // Function to add platform address
    function addPlatformAddress(address _platformAddress) public onlyOwner() {
        require(platformAddress[_platformAddress] == false, "already platform address");
        platformAddress[_platformAddress] = true;

        emit AddedPlatformAddress(_platformAddress, now);
    }

    // Function to remove platform address
    function removePlatformAddress(address _platformAddress) public onlyOwner() {
        require(platformAddress[_platformAddress] == true, "not platform address");
        platformAddress[_platformAddress] = false;

        emit RemovedPlatformAddress(_platformAddress, now);
    }
}