const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const Token = artifacts.require("Demo");

module.exports = async function (deployer, networks, accounts) {

    // Owner address
    const owner = accounts[1];

    // Address of NFY token
    //const NFYAddress = "0x1cbb83ebcd552d5ebf8131ef8c9cd9d9bab342bc";

    // Address of reward pool
    const rewardPool = accounts[2];

    await deployer.deploy(Token);

    const token = await Token.deployed();

    // Token deployment
    await deployer.deploy(NFYStakingNFT);

    const nfyStakingNFT = await NFYStakingNFT.deployed();

    // Funding deployment
    await deployer.deploy(NFYStaking, token.address, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool);

    const nfyStaking = await NFYStaking.deployed()

    await nfyStakingNFT.addPlatformAddress(nfyStaking.address);

    // Transfer ownership to secured secured account
    await nfyStakingNFT.transferOwnership(owner);
    await nfyStaking.transferOwnership(owner);

};