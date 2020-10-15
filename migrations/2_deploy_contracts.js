const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");

module.exports = async function (deployer, networks, accounts) {

    // Owner address
    const owner = "0x5530fb19c22B1B410708b0A9fD230c714cbA12Ed";

    // Address of NFY token
    const NFYAddress = "0x1cbb83ebcd552d5ebf8131ef8c9cd9d9bab342bc";

    // Address of reward pool
    const rewardPool = "";

    // Token deployment
    await deployer.deploy(NFYStakingNFT);

    const nfyStakingNFT = await NFYStakingNFT.deployed();

    // Funding deployment
    await deployer.deploy(NFYStaking, NFYAddress, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool);

    const nfyStaking = await NFYStaking.deployed()

    // Transfer ownership to secured secured account
    await nfyStakingNFT.transferOwnership(owner);
    await nfyStaking.transferOwnership(owner);

};