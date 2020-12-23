const NFYStakingNFT = artifacts.require("NFYStakingNFTV2");
const LPStakingNFT = artifacts.require("LPStakingNFTV2");
const NFYStaking = artifacts.require("NFYStakingV2");
const LPStaking = artifacts.require("LPStakingV2");

module.exports = async function (deployer, networks, accounts) {

    // Reward Pool Address
    const rewardPoolAddress = "0x2f822dA8016d5e8ce3c93b53eE1528392Ca3ac57"

    // Owner address
    const owner = "0x5530fb19c22B1B410708b0A9fD230c714cbA12Ed";

    // Address of NFY token
    const NFYAddress = "0x1cbb83ebcd552d5ebf8131ef8c9cd9d9bab342bc";

    //Address of NFY/ETH LP token
    const LPAddress = "0x146d3401b6a41122bd318ba676a01c44cb0795e2";

    // NFY Staking NFT deployment
    await deployer.deploy(NFYStakingNFT);

    // NFY/ETH LP Staking NFT deployment
    await deployer.deploy(LPStakingNFT);

    const nfyStakingNFT = await NFYStakingNFT.deployed();
    const lpStakingNFT = await LPStakingNFT.deployed()

    // NFY Staking deployment
    await deployer.deploy(NFYStaking, NFYAddress, nfyStakingNFT.address, nfyStakingNFT.address, rewardPoolAddress, 10);

    // NFY/ETH LP Staking deployment
    await deployer.deploy(LPStaking, LPAddress, NFYAddress, lpStakingNFT.address, lpStakingNFT.address, rewardPoolAddress, 30);

    const nfyStaking = await NFYStaking.deployed();
    const lpStaking = await LPStaking.deployed();

    await nfyStakingNFT.addPlatformAddress(nfyStaking.address);
    await lpStakingNFT.addPlatformAddress(lpStaking.address);

    // Transfer ownership to secured secured account
    await nfyStakingNFT.transferOwnership(owner);
    await lpStakingNFT.transferOwnership(owner);
    await nfyStaking.transferOwnership(owner);
    await lpStaking.transferOwnership(owner);
};
