const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const LPStakingNFT = artifacts.require("LPStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const LPStaking = artifacts.require("LPStaking");
const RewardPool = artifacts.require("RewardPool");
const Token = artifacts.require("Demo");
const LP = artifacts.require("DemoLP");

const truffleAssert = require("truffle-assertions");
const helper = require('./utils/utils.js');

contract("LPStakingNFT", async (accounts) => {

    let owner;
    let rewardPool;
    let user;
    let user2;
    let user3;
    let testPlatform;
    let rewardTokensBefore
    let token;
    let lp;
    let lpStakingNFT;
    let lpStaking;
    let initialBalance;
    let stakeAmount;

     before(async () => {
        // Owner address
        owner = accounts[1];

        user = accounts[3];

        user2 = accounts[4];

        user3 = accounts[5];

        testPlatform = accounts[6];

        initialBalanceBefore = 1000
        allowanceBefore = 2000;
        stakeAmountBefore = 5;
        moreThanBalanceBefore = 1005;
        rewardTokensBefore = 60000

        initialBalance = web3.utils.toWei(initialBalanceBefore.toString(), 'ether');
        allowance = web3.utils.toWei(allowanceBefore.toString(), 'ether');
        stakeAmount = web3.utils.toWei(stakeAmountBefore.toString(), 'ether');
        moreThanBalance = web3.utils.toWei(moreThanBalanceBefore.toString(), 'ether');
        rewardTokens = web3.utils.toWei(rewardTokensBefore.toString(), 'ether');

     });

     beforeEach(async () => {
        token = await Token.new();

        lp = await LP.new();

        // Token deployment
        lpStakingNFT = await LPStakingNFT.new();

        rewardPool = await RewardPool.new(token.address);

        token.faucet(rewardPool.address, rewardTokens);

        // Funding deployment
        lpStaking = await LPStaking.new(lp.address, token.address, lpStakingNFT.address, lpStakingNFT.address, rewardPool.address, 30);

        // Add NFY Staking contract as a platform address
        await lpStakingNFT.addPlatformAddress(lpStaking.address);

        // Add test platform for nfyStaking
        await lpStaking.addPlatformAddress(testPlatform);

        await rewardPool.allowTransferToStaking(lpStaking.address, rewardTokens);

        // Transfer ownership to secured secured account
        await lpStakingNFT.transferOwnership(owner);
        await lpStaking.transferOwnership(owner);
        await rewardPool.transferOwnership(owner);

        await lp.faucet(user, initialBalance);
        await lp.faucet(user2, initialBalance);
        await lp.faucet(user3, initialBalance);
     });

     describe("# mint()", () => {

        it('should NOT let user mint new NFT directly from contract', async () => {
            await truffleAssert.reverts(lpStakingNFT.mint(user, {from: user}));
        });

        it('should NOT let owner mint new NFT directly from contract', async () => {
            await truffleAssert.reverts(lpStakingNFT.mint(owner, {from: owner}));
        });
     });

     describe("# revertNftTokenId()", () => {

        it('should NOT let user revert NFT directly from contract', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            await truffleAssert.reverts(lpStakingNFT.revertNftTokenId(user, 1, {from: user}));
        });

        it('should NOT let owner revert NFT directly from contract', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            await truffleAssert.reverts(lpStakingNFT.revertNftTokenId(user, 1, {from: owner}));
        });
     });

     describe("# nftTokenId ()", () => {
        it('should return 0 if stakeholder address has no NFY staking nft', async () => {
            const returnVal = await lpStakingNFT.nftTokenId(user);
            assert.strictEqual(0, returnVal.toNumber());
        });

        it('should return 0 if stakeholder sent nft', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            const returnValBefore = await lpStakingNFT.nftTokenId(user);

            assert.strictEqual(1, returnValBefore.toNumber());
            await lpStakingNFT.transferFrom(user, user2, 1, {from: user});

            const returnValAfter = await lpStakingNFT.nftTokenId(user);
            assert.strictEqual(0, returnValAfter.toNumber());
        });

        it('should return token id that stake holder minted', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lp.approve(lpStaking.address, allowance, {from: user2});

            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user2}));

            const returnVal1 = await lpStakingNFT.nftTokenId(user);
            assert.strictEqual(1, returnVal1.toNumber());

            const returnVal2 = await lpStakingNFT.nftTokenId(user2);
            assert.strictEqual(2, returnVal2.toNumber());
        });

        it('should return 0 if stake holder unstaked', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            const returnValBefore = await lpStakingNFT.nftTokenId(user);
            assert.strictEqual(1, returnValBefore.toNumber());

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));

            lpStaking.unstakeLP(1, {from: user});
            const returnValAfter = await lpStakingNFT.nftTokenId(user2);
            assert.strictEqual(0, returnValAfter.toNumber());
        });
     });

     describe("# burn()", () => {

        it('should NOT let user burn NFT directly from contract', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            await truffleAssert.reverts(lpStakingNFT.burn(1, {from: user}));
        });

        it('should NOT let owner burn NFT directly from contract', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            await truffleAssert.reverts(lpStakingNFT.burn(1, {from: owner}));
        });
     });



});
