const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const RewardPool = artifacts.require("RewardPool");
const Token = artifacts.require("Demo");

module.exports = async function (deployer, networks, accounts) {

    let rewardTokensBefore = 60000; // 60,000
    rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');


    // Owner address
    const owner = accounts[1];


    // Address of NFY token
    //const NFYAddress = "0x1cbb83ebcd552d5ebf8131ef8c9cd9d9bab342bc";

    // Deploy token
    await deployer.deploy(Token);

    const token = await Token.deployed();

    // Deploy reward pool
    await deployer.deploy(RewardPool, token.address);

    const rewardPool = await RewardPool.deployed();

    token.faucet(rewardPool.address, rewardTokens);

    // Token deployment
    await deployer.deploy(NFYStakingNFT);

    const nfyStakingNFT = await NFYStakingNFT.deployed();

    // Funding deployment
    await deployer.deploy(NFYStaking, token.address, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool.address, 1000);

    const nfyStaking = await NFYStaking.deployed()

    await nfyStakingNFT.addPlatformAddress(nfyStaking.address);

    await rewardPool.allowTransferToStaking(nfyStaking.address, rewardTokens);

    // Transfer ownership to secured secured account
    await nfyStakingNFT.transferOwnership(owner);
    await nfyStaking.transferOwnership(owner);
    await rewardPool.transferOwnership(owner);
};