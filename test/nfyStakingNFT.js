const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const Token = artifacts.require("Demo");
const truffleAssert = require("truffle-assertions");


contract("NFYStakingNFT", async (accounts) => {

    let owner;
    let rewardPool;
    let user;
    let user2;
    let user3;
    let token;
    let nfyStakingNFT;
    let nfyStaking;
    let initialBalance;
    let stakeAmount;

     before(async () => {
        // Owner address
        owner = accounts[1];

        // Address of reward pool
        rewardPool = accounts[2];

        user = accounts[3];

        user2 = accounts[4];

        user3 = accounts[5];

        initialBalanceBefore = 1000
        allowanceBefore = 2000;
        stakeAmountBefore = 5;
        moreThanBalanceBefore = 1005;

        initialBalance = web3.utils.toWei(initialBalanceBefore.toString(), 'ether');
        allowance = web3.utils.toWei(allowanceBefore.toString(), 'ether');
        stakeAmount = web3.utils.toWei(stakeAmountBefore.toString(), 'ether');
        moreThanBalance = web3.utils.toWei(moreThanBalanceBefore.toString(), 'ether');

     });

     beforeEach(async () => {
        token = await Token.new();

        // Token deployment
        nfyStakingNFT = await NFYStakingNFT.new();

        // Funding deployment
        nfyStaking = await NFYStaking.new(token.address, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool, 1000);

        // Add NFY Staking contract as a platform address
        await nfyStakingNFT.addPlatformAddress(nfyStaking.address);

        // Transfer ownership to secured secured account
        await nfyStakingNFT.transferOwnership(owner);
        await nfyStaking.transferOwnership(owner);

        await token.faucet(user, initialBalance);
        await token.faucet(user2, initialBalance);
        await token.faucet(user3, initialBalance);
     });

     describe("# mint()", () => {

        it('should NOT let user mint new NFT directly from contract', async () => {
            await truffleAssert.reverts(nfyStakingNFT.mint(user, {from: user}));
        });

        it('should NOT let owner mint new NFT directly from contract', async () => {
            await truffleAssert.reverts(nfyStakingNFT.mint(owner, {from: owner}));
        });

     });

     describe("# revertNftTokenId()", () => {

        it('should NOT let user revert NFT directly from contract', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            await truffleAssert.reverts(nfyStakingNFT.revertNftTokenId(user, 1, {from: user}));
        });

        it('should NOT let owner revert NFT directly from contract', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            await truffleAssert.reverts(nfyStakingNFT.revertNftTokenId(user, 1, {from: owner}));
        });

     });

     describe("# burn()", () => {

        it('should NOT let user burn NFT directly from contract', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            await truffleAssert.reverts(nfyStakingNFT.burn(1, {from: user}));
        });

        it('should NOT let owner burn NFT directly from contract', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            await truffleAssert.reverts(nfyStakingNFT.burn(1, {from: owner}));
        });

     });

});