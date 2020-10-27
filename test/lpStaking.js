const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const LPStakingNFT = artifacts.require("LPStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const LPStaking = artifacts.require("LPStaking");
const RewardPool = artifacts.require("RewardPool");
const Token = artifacts.require("Demo");
const LP = artifacts.require("DemoLP");

const truffleAssert = require("truffle-assertions");
const helper = require('./utils/utils.js');

contract("LPStaking", async (accounts) => {

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

     describe("# constructor()", () => {

        it('should set LP Token properly', async () => {
            assert.strictEqual(lp.address, await lpStaking.LPToken());
        });

        it('should set NFY Token properly', async () => {
            assert.strictEqual(token.address, await lpStaking.NFYToken());
        });

        it("Sets the NFY/ETH LP staking NFT interface properly", async () => {
           assert.strictEqual(lpStakingNFT.address, await lpStaking.StakingNFT());
        });

        it('should set staking address properly', async () => {
            assert.strictEqual(lpStakingNFT.address, await lpStaking.staking());
        });

        it('should set reward pool address properly', async () => {
            assert.strictEqual(rewardPool.address, await lpStaking.rewardPool());
        });

        it('should set owner properly', async () => {
            assert.strictEqual(owner, await lpStaking.owner());
        });

        it('should set daily reward % properly', async () => {
            assert.strictEqual('30', (BigInt(await lpStaking.dailyReward())).toString());
        });
     });

     describe("# getRewardPerBlock()", () => {
        it('should calculate reward per block properly', async () => {
            const rewardPoolBalance = await token.balanceOf(rewardPool.address);
            const expectedReward = rewardPoolBalance / 6500 / 3000;
            const actualReward = await lpStaking.getRewardPerBlock();
            console.log((BigInt(actualReward)).toString());

            //assert.strictEqual(BigInt(expectedReward), BigInt(actualReward));
        });

     });

     describe("# setDailyReward()", () => {

        it('should NOT allow a non-owner to set daily reward %', async () => {
            await truffleAssert.reverts(lpStaking.setDailyReward(20, {from: user}));
        });

        it('should allow owner to set daily reward %', async () => {
            assert.strictEqual('30', (BigInt(await lpStaking.dailyReward())).toString());
            await truffleAssert.passes(lpStaking.setDailyReward(20, {from: owner}));
            assert.strictEqual('20', (BigInt(await lpStaking.dailyReward())).toString());
        });

     });

     describe("# getNFTBalance()", () => {
        it('should return 0 if the NFT does not exist', async () => {
            assert.strictEqual(0, (await lpStaking.getNFTBalance(1)).toNumber());
        });

        it('should return correct balance when user stakes', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            assert.strictEqual(stakeAmount.toString(), (BigInt(await lpStaking.getNFTBalance(1)).toString()));
        });
     });

     describe("# checkIfNFTInCirculation()", () => {

        it('should NOT be in circulation if it has not been minted yet', async () => {
            const inCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, false);

        });

        it('should be in circulation if it has been minted', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});

            console.log(BigInt(await lp.balanceOf(user)));
            console.log(BigInt(await lp.allowance(user, lpStaking.address)));

            await truffleAssert.passes(lpStaking.updatePool);
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            const inCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, true);
        });

        it('should NOT be in circulation if it has been unstaked', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            const inCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.reverts(lpStaking.turnEmergencyWithdrawOn({from: user}));
            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));

            await truffleAssert.passes(lpStaking.unstakeLP(1, {from: user}));
            const notInCirculation = await lpStaking.checkIfNFTInCirculation(1);

            assert.strictEqual(notInCirculation, false);
        });

     });

     describe("# pendingRewards()", () => {
        it('should NOT have any pending rewards if not minted yet', async () => {
            assert.strictEqual(0, (await lpStaking.pendingRewards(1)).toNumber());
        });

        it('should calculate proper rewards when block has passes', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            await helper.advanceBlock();
            assert.strictEqual(BigInt(await lpStaking.getRewardPerBlock()), BigInt(await lpStaking.pendingRewards(1)));

            await helper.advanceBlock();
            assert.strictEqual((BigInt(await lpStaking.getRewardPerBlock()) * BigInt(2)).toString(), BigInt(await lpStaking.pendingRewards(1)).toString());
        });
     });

     describe("# getTotalRewards()", () => {
        it('should NOT have any rewards for a user without a NFT', async () => {
            assert.strictEqual(0, (await lpStaking.getTotalRewards(user)).toNumber());
        });

        it('should get total rewards of an address with one NFT', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            await helper.advanceBlock();
            assert.strictEqual((BigInt(await lpStaking.getRewardPerBlock()).toString()), (BigInt(await lpStaking.getTotalRewards(user))).toString());

            await helper.advanceBlock();
            assert.strictEqual((BigInt(await lpStaking.getRewardPerBlock()) * BigInt(2)).toString(), BigInt(await lpStaking.getTotalRewards(user)).toString());
        });

        it('should show total pending rewards if user has multiple NFTs', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lp.approve(lpStaking.address, allowance, {from: user2});

            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            await helper.advanceBlock();

            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user2}));

            let i = 0;
            while(i < 5){
            await helper.advanceBlock();
            i++;
            }

            await lpStakingNFT.transferFrom(user, user2, 1, {from: user});
            const nft1 = BigInt(await lpStaking.pendingRewards(2));
            const nft2 = BigInt(await lpStaking.pendingRewards(1));
            const user2Rewards = BigInt(await lpStaking.getTotalRewards(user2));

            assert.strictEqual(nft1 + nft2, user2Rewards);
            assert.strictEqual(0, (await lpStaking.getTotalRewards(user)).toNumber());
        });
     });

     describe("# getTotalBalance()", () => {
        it('should NOT have any balance for a user without a NFT', async () => {
            assert.strictEqual(0, (await lpStaking.getTotalBalance(user)).toNumber());
        });

        it('should get total balance of an address with one NFT', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            assert.strictEqual(BigInt(stakeAmount), BigInt(await lpStaking.getTotalBalance(user)));

            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            assert.strictEqual(BigInt(stakeAmount * 2), BigInt(await lpStaking.getTotalBalance(user)));
        });

        it('should show total balance if user has multiple NFTs', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lp.approve(lpStaking.address, allowance, {from: user2});

            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user2}));

            await lpStakingNFT.transferFrom(user, user2, 1, {from: user});
            const nft1 = BigInt(await lpStaking.getNFTBalance(2));
            const nft2 = BigInt(await lpStaking.getNFTBalance(1));
            const user2Balance = BigInt(await lpStaking.getTotalBalance(user2));

            assert.strictEqual(nft1 + nft2, user2Balance);
            assert.strictEqual(0, (await lpStaking.getTotalBalance(user)).toNumber());
        });
     });

     describe("# updatePool()", () => {
        it('should emit proper amount of blocks to reward', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            let update = await lpStaking.updatePool();

            assert.strictEqual("PoolUpdated", update.logs[0].event);
            assert.strictEqual(1, update.logs.length);

            assert.strictEqual(21, update.logs[0].args._blocksRewarded.toNumber());
        });

        it('should emit proper reward to send to staking address', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            const previousRewardPerBlock = BigInt(await lpStaking.getRewardPerBlock());
            let update = await lpStaking.updatePool();

            assert.strictEqual("PoolUpdated", update.logs[0].event);

            assert.strictEqual((previousRewardPerBlock * BigInt(21)).toString(), update.logs[0].args._amountRewarded.toString());
        });

        it('should send proper rewards to staking address', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            const stakingAddressBefore = await token.balanceOf(lpStaking.address);

            const previousRewardPerBlock = BigInt(await lpStaking.getRewardPerBlock());
            let update = await lpStaking.updatePool();

            const stakingAddressAfter = await token.balanceOf(lpStaking.address);

            console.log(BigInt(stakingAddressBefore));
            console.log(BigInt(update.logs[0].args._amountRewarded));
            console.log(BigInt(stakingAddressAfter));

            assert.strictEqual((BigInt(update.logs[0].args._amountRewarded) + BigInt(stakingAddressBefore)).toString(), (BigInt(stakingAddressAfter)).toString());
        });

        it('should update accNfyPerShare', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            const accNfyBefore = BigInt(await lpStaking.accNfyPerShare());

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            let update = await lpStaking.updatePool();

            const accNfyAfter = BigInt(await lpStaking.accNfyPerShare());
            const rewardsToSend = BigInt(update.logs[0].args._amountRewarded);

            assert.strictEqual((accNfyBefore + rewardsToSend * BigInt(1e18) / BigInt(await lpStaking.totalStaked())).toString(),accNfyAfter.toString())
        });

        it('should update last reward block', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            const lastRewardBlockBefore = BigInt(await lpStaking.lastRewardBlock());

            const previousRewardPerBlock = BigInt(await lpStaking.getRewardPerBlock());
            let update = await lpStaking.updatePool();

            const lastRewardBlockAfter = BigInt(await lpStaking.lastRewardBlock());

            const stakingAddressAfter = await lp.balanceOf(lpStaking.address);

            assert.strictEqual(lastRewardBlockAfter.toString(), (lastRewardBlockBefore + BigInt(update.logs[0].args._blocksRewarded)).toString());
        });

     });

     describe("# stakeLP()", () => {

        it('should REVERT if user tries to stake with out allowing', async () => {
            await truffleAssert.reverts(lpStaking.stakeLP(stakeAmount, {from: user}));
        });

        it('should NOT let a user stake if their balance is not enough', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.reverts(lpStaking.stakeLP(moreThanBalance, {from: user}));
        });

        it('should let a user stake if funds approved', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
        });

        it('should NOT allow a user to stake 0 tokens', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.reverts(lpStaking.stakeLP(0, {from: user}), "Can not stake 0 LP");
        });

        it('should transfer NFY/ETH LP to contract address', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const balanceBefore = await lp.balanceOf(lpStaking.address);
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            const balanceAfter = await lp.balanceOf(lpStaking.address);
            assert.strictEqual(BigInt(balanceBefore) + BigInt(stakeAmount), BigInt(balanceAfter));
        });

        it('should update NFY/ETH LP balance of user', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const balanceBefore = await lp.balanceOf(user);
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            const balanceAfter = await lp.balanceOf(user);
            assert.strictEqual(BigInt(balanceBefore) - BigInt(stakeAmount), BigInt(balanceAfter));
        });

        it('should mint new NFT when new user stakes', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const transaction = await lpStaking.stakeLP(stakeAmount, {from: user});

            assert.strictEqual("MintedToken", transaction.logs[0].event);
            assert.strictEqual(user, transaction.logs[0].args._staker);
            const tokenId = transaction.logs[0].args._tokenId;
            assert.strictEqual(1, transaction.logs[0].args._tokenId.toNumber());
            assert.strictEqual(2, transaction.logs.length);
            assert.strictEqual("StakeCompleted", transaction.logs[1].event);
            assert.strictEqual(user, transaction.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction.logs[1].args._amount));
            assert.strictEqual(1, transaction.logs[1].args._tokenId.toNumber());
        });

        it('second stake should mint NFT w id 2 after first stake when new user stakes', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lp.approve(lpStaking.address, allowance, {from: user2});
            const transaction1 = await lpStaking.stakeLP(stakeAmount, {from: user});
            const transaction2 = await lpStaking.stakeLP(stakeAmount, {from: user2});

            assert.strictEqual("MintedToken", transaction1.logs[0].event);
            assert.strictEqual(user, transaction1.logs[0].args._staker);

            assert.strictEqual(1, transaction1.logs[0].args._tokenId.toNumber());
            assert.strictEqual(2, transaction1.logs.length);
            assert.strictEqual("StakeCompleted", transaction1.logs[1].event);
            assert.strictEqual(user, transaction1.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction1.logs[1].args._amount));
            assert.strictEqual(1, transaction1.logs[1].args._tokenId.toNumber());

            assert.strictEqual("MintedToken", transaction2.logs[1].event);
            assert.strictEqual(user2, transaction2.logs[1].args._staker);

            assert.strictEqual(2, transaction2.logs[1].args._tokenId.toNumber());
            assert.strictEqual(3, transaction2.logs.length);
            assert.strictEqual("StakeCompleted", transaction2.logs[2].event);
            assert.strictEqual(user2, transaction2.logs[2].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[2].args._amount));
            assert.strictEqual(2, transaction2.logs[2].args._tokenId.toNumber());
        });

        it('should NOT mint new NFT when existing user stakes', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const transaction = await lpStaking.stakeLP(stakeAmount, {from: user});

            assert.strictEqual("MintedToken", transaction.logs[0].event);
            assert.strictEqual(user, transaction.logs[0].args._staker);

            assert.strictEqual(1, transaction.logs[0].args._tokenId.toNumber());
            assert.strictEqual(2, transaction.logs.length);
            assert.strictEqual("StakeCompleted", transaction.logs[1].event);
            assert.strictEqual(user, transaction.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction.logs[1].args._amount));
            assert.strictEqual(1, transaction.logs[1].args._tokenId.toNumber());

            const firstStake = transaction.logs[1].args._totalStaked.toString();
            console.log(firstStake);
            console.log(stakeAmount);
            assert.strictEqual(stakeAmount, firstStake);

            const transaction2 = await lpStaking.stakeLP(stakeAmount, {from: user});

            assert.strictEqual("RewardsClaimed", transaction2.logs[1].event);
            assert.strictEqual("StakeCompleted", transaction2.logs[2].event);
            assert.strictEqual(3, transaction2.logs.length);
            assert.strictEqual(user, transaction2.logs[2].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[2].args._amount));
            assert.strictEqual(1, transaction2.logs[2].args._tokenId.toNumber());

            const secondStake = transaction2.logs[2].args._totalStaked.toString();
            console.log(secondStake);
            console.log((stakeAmount * 2).toString());

            assert.strictEqual((stakeAmount * 2).toString(), secondStake);
        });

        it('should mint a new NFT if user stakes and sent their NFT to another address', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const transaction = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();
            console.log(await lpStakingNFT.ownerOf(tokenId));

            await lpStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await lpStakingNFT.ownerOf(tokenId));

            const transaction2 = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId2 = transaction2.logs[1].args._tokenId.toNumber();
            console.log(await lpStakingNFT.ownerOf(tokenId2));
            assert.strictEqual(3, transaction2.logs.length);

            assert.strictEqual("MintedToken", transaction2.logs[1].event);
            assert.strictEqual(user, transaction2.logs[1].args._staker);

            assert.strictEqual(2, transaction2.logs[1].args._tokenId.toNumber());
            assert.strictEqual("StakeCompleted", transaction2.logs[2].event);
            assert.strictEqual(user, transaction2.logs[2].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[2].args._amount));
            assert.strictEqual(2, transaction2.logs[2].args._tokenId.toNumber());

            const transaction3 = await lpStaking.stakeLP(stakeAmount, {from: user});

            assert.strictEqual("RewardsClaimed", transaction3.logs[1].event);
            assert.strictEqual("StakeCompleted", transaction3.logs[2].event);
            assert.strictEqual(3, transaction3.logs.length);
            assert.strictEqual(user, transaction3.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction3.logs[2].args._amount));
            assert.strictEqual(2, transaction3.logs[2].args._tokenId.toNumber());

            const secondStake = transaction3.logs[2].args._totalStaked.toString();
            console.log(secondStake);
            console.log((stakeAmount * 2).toString());

            assert.strictEqual((stakeAmount * 2).toString(), secondStake);
        });

        it('should update balance of new NFT after a user sends their original', async () => {

            await lp.approve(lpStaking.address, allowance, {from: user});
            const transaction = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();
            console.log(await lpStakingNFT.ownerOf(tokenId));

            await lpStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await lpStakingNFT.ownerOf(tokenId));

            const transaction2 = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId2 = transaction2.logs[1].args._tokenId.toNumber();
            console.log(await lpStakingNFT.ownerOf(tokenId2));
            assert.strictEqual(3, transaction2.logs.length);

            const transaction3 = await lpStaking.stakeLP(stakeAmount, {from: user});

            const balanceUpdated = await lpStaking.getNFTBalance(tokenId2);
            console.log(balanceUpdated.toString());
            console.log((stakeAmount * 2).toString());

            assert.strictEqual((stakeAmount * 2).toString(), balanceUpdated.toString());
        });

        it('should update totalStaked balance after a stake', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const totalStakedBefore = await lpStaking.totalStaked();
            await lpStaking.stakeLP(stakeAmount, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});

            const totalStakedAfter = await lpStaking.totalStaked();

            assert.strictEqual((BigInt(totalStakedBefore)).toString(), '0');
            assert.strictEqual((BigInt(totalStakedAfter)).toString(), (BigInt(stakeAmount * 2)).toString());
            assert.strictEqual((BigInt(totalStakedBefore) + BigInt(stakeAmount * 2)).toString(), (BigInt(totalStakedAfter)).toString());
        });

     });

     describe("# claimRewards()", () => {
        it('should NOT let a user who is not the owner claim the rewards', async () => {

            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            await truffleAssert.reverts(lpStaking.claimRewards(1, {from: user2}));
        });

        it('should let a user who is the owner claim the rewards', async () => {

            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            await truffleAssert.passes(lpStaking.claimRewards(1, {from: user}));
        });

        it('should update a user\'s balance after they claim rewards', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            const userBalanceBefore = BigInt(await token.balanceOf(user));

            let claim = await lpStaking.claimRewards(1, {from: user});

            const userBalanceAfter = BigInt(await token.balanceOf(user));
            const expectedRewards = BigInt(claim.logs[1].args._rewardsClaimed);

            assert.strictEqual((userBalanceBefore + expectedRewards).toString(), userBalanceAfter.toString());
        });

        it('should emit proper events', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            let claim = await lpStaking.claimRewards(1, {from: user});
            assert.strictEqual(2, claim.logs.length);
            assert.strictEqual("PoolUpdated", claim.logs[0].event);
            assert.strictEqual("RewardsClaimed", claim.logs[1].event);

            assert.strictEqual(claim.logs[1].args._staker, user);
            assert.strictEqual(claim.logs[1].args._tokenId.toNumber(), 1);
        });

     });

     describe("# claimAllRewards()", () => {
        it('should NOT let user call function if they do not have any NFY/ETH LP staking NFTs', async () => {
            await truffleAssert.reverts(lpStaking.claimAllRewards({from: user}));
        });

        it('should let user call function if they have 1 NFY/ETH LP staking NFTs', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lp.approve(lpStaking.address, allowance, {from: user2});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user2}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            await truffleAssert.passes(lpStaking.claimAllRewards({from: user}));
        });

        it('should let user call function if they have multiple NFY/ETH LP staking NFTs', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            await lpStakingNFT.transferFrom(user, user2, 1, {from: user});

            await truffleAssert.passes(lpStaking.claimAllRewards({from: user2}));
            await truffleAssert.reverts(lpStaking.claimAllRewards({from: user}));
        });

        it('should properly update a user\'s balance if they claim the rewards for multiple NFTs', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lp.approve(lpStaking.address, allowance, {from: user2});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user2}));

            let i = 0;
            while(i < 20){
            await helper.advanceBlock();
            i++;
            }

            const previousRewardPerBlock = BigInt(await lpStaking.getRewardPerBlock());
            const user2BalanceBefore = BigInt(await token.balanceOf(user2));

            await lpStakingNFT.transferFrom(user, user2, 1, {from: user});
            assert.strictEqual(0, (await lpStaking.getTotalRewards(user)).toNumber());

            const nft1 = BigInt(await lpStaking.pendingRewards(2));
            const nft2 = BigInt(await lpStaking.pendingRewards(1));
            const user2Rewards = BigInt(await lpStaking.getTotalRewards(user2));

            await truffleAssert.passes(lpStaking.claimAllRewards({from: user2}));
            await truffleAssert.reverts(lpStaking.claimAllRewards({from: user}));
            const user2BalanceAfter = BigInt(await token.balanceOf(user2));

            assert.strictEqual((nft1 + nft2).toString(), user2Rewards.toString());
            assert.strictEqual((user2BalanceBefore + user2Rewards + previousRewardPerBlock).toString(), user2BalanceAfter.toString());
        });
     });

     describe("# unstakeLP()", () => {


        it('should NOT let a user unstake a token if emergency withdraw is not on', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const transaction = await lpStaking.stakeLP(stakeAmount, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();

            console.log(tokenId);
            console.log(await lpStakingNFT.ownerOf(1));
            console.log(user);

            const inCirculation = await lpStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.reverts(lpStaking.unstakeLP(tokenId, {from: user}));

        });


        it('should NOT let a user unstake a token that is not theirs', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await truffleAssert.reverts(lpStaking.unstakeLP(1, {from: user2}), "User is not owner of token");
        });

        it('should let a user unstake a token if it is theirs and emergency withdraw on', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const transaction = await lpStaking.stakeLP(stakeAmount, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();
            console.log(tokenId);
            console.log(await lpStakingNFT.ownerOf(1));
            console.log(user);

            const inCirculation = await lpStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await truffleAssert.passes(lpStaking.unstakeLP(tokenId, {from: user}));

        });

        it('should NOT let a user unstake a token that has already been unstaked', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const transaction = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await truffleAssert.passes(lpStaking.unstakeLP(tokenId, {from: user}));

            const notInCirculation = await lpStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(notInCirculation, false);

            await truffleAssert.reverts(lpStaking.unstakeLP(1, {from: user}));
        });

        it('should update balance after withdraw has been completed', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const stake = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            assert.strictEqual(2, stake.logs.length);

            const balanceBefore = await lp.balanceOf(user);
            console.log(BigInt(balanceBefore));

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            const unstake = await (lpStaking.unstakeLP(tokenId, {from: user}));
            assert.strictEqual(3, unstake.logs.length);
            console.log(BigInt(unstake.logs[1].args._amount));

            const rewards = BigInt(unstake.logs[2].args._rewardsClaimed);

            const balanceAfter = await lp.balanceOf(user);
            console.log(BigInt(balanceAfter));
            console.log(BigInt(balanceBefore));

            assert.strictEqual((BigInt(balanceBefore) + BigInt(amountStaked)).toString(), (BigInt(balanceAfter)).toString());
            assert.strictEqual((BigInt(rewards)).toString(), (BigInt(await token.balanceOf(user))).toString());
        });

        it('should update reward pool after withdraw', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const balanceBefore = await token.balanceOf(rewardPool.address);
            const stake = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            console.log(BigInt(balanceBefore));

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            const unstake = await (lpStaking.unstakeLP(tokenId, {from: user}));
            assert.strictEqual(3, unstake.logs.length);
            console.log(BigInt(unstake.logs[1].args._amount));
            const rewards = BigInt(unstake.logs[2].args._rewardsClaimed);

            const balanceAfter = await token.balanceOf(rewardPool.address);

            const balanceAfterShouldBe = (BigInt(balanceBefore) - rewards);
            const balanceAfterShouldBeToString = balanceAfterShouldBe.toString();
            console.log(BigInt(balanceAfter.toString()));
            console.log(balanceAfterShouldBeToString);
            console.log(rewards.toString());

            assert.strictEqual(balanceAfterShouldBeToString, balanceAfter.toString());
        });

        it('should set user nft Token Id to 0 after unstake', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenIdBefore = await lpStakingNFT.nftTokenId(user);
            console.log(tokenIdBefore.toNumber());
            assert.strictEqual(1, tokenIdBefore.toNumber());

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await (lpStaking.unstakeLP(tokenIdBefore, {from: user}));
            const tokenIdAfter = await lpStakingNFT.nftTokenId(user);
            console.log(tokenIdAfter.toNumber());
            assert.strictEqual(0, tokenIdAfter.toNumber());
        });

        it('should NOT let a user stake once emergency withdraw ins on', async() => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await (lpStaking.unstakeLP(1, {from: user}));

            await truffleAssert.reverts(lpStaking.stakeLP(stakeAmount, {from: user}));

        });

        it('should set NFT balance to 0 after unstaked', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});

            const tokenId = await lpStakingNFT.nftTokenId(user);

            const getNFTBalanceBefore = await lpStaking.getNFTBalance(tokenId);
            assert.strictEqual(BigInt(stakeAmount), BigInt(getNFTBalanceBefore));

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await lpStaking.unstakeLP(tokenId, {from: user});
            const getNFTBalanceAfter = await lpStaking.getNFTBalance(tokenId);
            assert.strictEqual(BigInt(0), BigInt(getNFTBalanceAfter));

        });

        it('should set NFT inCirculation bool to false after unstaked', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});

            const tokenId = await lpStakingNFT.nftTokenId(user);
            const inCirculation = await lpStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await lpStaking.unstakeLP(tokenId, {from: user});
            const notInCirculation = await lpStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(notInCirculation, false);
        });

        it('should allow a user to unstake a token that has been sent to them and update their balance', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const stake = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            assert.strictEqual(2, stake.logs.length);

            await lpStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await lpStakingNFT.ownerOf(tokenId));

            const balanceBefore = await lp.balanceOf(user2);
            console.log(BigInt(balanceBefore));

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            const unstake = await (lpStaking.unstakeLP(tokenId, {from: user2}));
            const rewards = BigInt(unstake.logs[2].args._rewardsClaimed);

            assert.strictEqual(3, unstake.logs.length);
            console.log(BigInt(unstake.logs[1].args._amount));

            const balanceAfter = await lp.balanceOf(user2);
            console.log(BigInt(balanceAfter));
            console.log(BigInt(balanceBefore) + (BigInt(amountStaked)));

            assert.strictEqual((BigInt(balanceBefore) + BigInt(amountStaked)).toString(), (BigInt(balanceAfter).toString()));
            assert.strictEqual(rewards.toString(), (BigInt(await token.balanceOf(user2))).toString());
        });

        it('should NOT allow a user to unstake a token that they have sent', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const stake = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            assert.strictEqual(2, stake.logs.length);

            await lpStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await lpStakingNFT.ownerOf(tokenId));

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await truffleAssert.reverts(lpStaking.unstakeLP(tokenId, {from: user}));

            await truffleAssert.passes(lpStaking.unstakeLP(tokenId, {from: user2}));
        });

        it('should let owner unstake if the NFT is sent multiple times', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            const stake = await lpStaking.stakeLP(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            assert.strictEqual(2, stake.logs.length);

            await lpStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await lpStakingNFT.ownerOf(tokenId));

            await lpStakingNFT.transferFrom(user2, user3, tokenId, {from: user2});
            console.log(await lpStakingNFT.ownerOf(tokenId));

            const balanceBefore1 = await lp.balanceOf(user);
            console.log(BigInt(balanceBefore1));

            const balanceBefore2 = await lp.balanceOf(user2);
            console.log(BigInt(balanceBefore2));

            const balanceBefore3 = await lp.balanceOf(user3);
            console.log(BigInt(balanceBefore3));

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await truffleAssert.reverts(lpStaking.unstakeLP(tokenId, {from: user}));
            await truffleAssert.reverts(lpStaking.unstakeLP(tokenId, {from: user2}));
            const unstake = await(lpStaking.unstakeLP(tokenId, {from: user3}));
            const rewards = BigInt(unstake.logs[2].args._rewardsClaimed);

            assert.strictEqual(3, unstake.logs.length);
            console.log(BigInt(unstake.logs[1].args._amount));

            const balanceAfter1 = await lp.balanceOf(user);
            const balanceAfter2 = await lp.balanceOf(user2);
            const balanceAfter3 = await lp.balanceOf(user3);

            console.log(BigInt(balanceAfter1));
            console.log(BigInt(balanceAfter2));
            console.log(BigInt(balanceAfter3));

            console.log(BigInt(balanceBefore3) + (BigInt(amountStaked)));

            assert.strictEqual(BigInt(balanceBefore1), (BigInt(balanceAfter1)));
            assert.strictEqual(BigInt(balanceBefore2), (BigInt(balanceAfter2)));
            assert.strictEqual((BigInt(balanceBefore3) + (BigInt(amountStaked))).toString(), (BigInt(balanceAfter3)).toString());
        });

        it('should update totalStaked balance after an unstake', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});

            const totalStakedBefore = await lpStaking.totalStaked();

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await lpStaking.unstakeLP(1, {from: user});

            const totalStakedAfter = await lpStaking.totalStaked();

            assert.strictEqual((BigInt(totalStakedBefore)).toString(), (BigInt(stakeAmount * 2)).toString());
            assert.strictEqual((BigInt(totalStakedAfter)).toString(), '0');
            assert.strictEqual((BigInt(totalStakedBefore).toString()), ((BigInt(totalStakedAfter)) + BigInt(stakeAmount * 2)).toString());
        });

     });

     describe("# incrementNFTValue()", () => {
        it('should NOT increase value of NFT if not called by owner of Contract', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            const balanceBefore = await lpStaking.getNFTBalance(1);

            await truffleAssert.reverts(lpStaking.incrementNFTValue(1, stakeAmount, {from: owner}));

            const balanceAfter = await lpStaking.getNFTBalance(1);

            assert.strictEqual((BigInt(balanceBefore)).toString(), (BigInt(balanceAfter)).toString());
        });

        it('should NOT increase value of NFT if not called by owner of NFT', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            const balanceBefore = await lpStaking.getNFTBalance(1);

            await truffleAssert.reverts(lpStaking.incrementNFTValue(1, stakeAmount, {from: user}));

            const balanceAfter = await lpStaking.getNFTBalance(1);

            assert.strictEqual((BigInt(balanceBefore)).toString(), (BigInt(balanceAfter)).toString());
        });

        it('should increase value of NFT if called by platform', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));
            const balanceBefore = await lpStaking.getNFTBalance(1);

            await truffleAssert.passes(lpStaking.incrementNFTValue(1, stakeAmount, {from: testPlatform}));

            const balanceAfter = await lpStaking.getNFTBalance(1);

            assert.strictEqual((BigInt(balanceBefore) + BigInt(stakeAmount)).toString(), (BigInt(balanceAfter)).toString());
        });

        it('should send rewards to owner when function gets called and pending rewards after should be 0', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(stakeAmount, {from: user}));

            let i = 0;
            while(i < 100){
            await helper.advanceBlock();
            i++;
            }

            const userBalanceBefore = BigInt(await token.balanceOf(user));
            const balanceBeforeLP = await lpStaking.getNFTBalance(1);
            console.log(userBalanceBefore);

            let increment = await lpStaking.incrementNFTValue(1, stakeAmount, {from: testPlatform});

            const userBalanceAfter = BigInt(await token.balanceOf(user));
            const balanceAfterLP = await lpStaking.getNFTBalance(1);
            const expectedRewards = BigInt(increment.logs[1].args._rewardsClaimed);

            console.log(userBalanceAfter);
            console.log(expectedRewards);

            console.log(BigInt(balanceBeforeLP));
            console.log(BigInt(balanceAfterLP));

            console.log(BigInt(await lpStaking.pendingRewards(1)));

            assert.strictEqual((userBalanceBefore + expectedRewards).toString(), userBalanceAfter.toString());
            assert.strictEqual((BigInt(balanceBeforeLP) + BigInt(stakeAmount)).toString(), (BigInt(balanceAfterLP)).toString());
            assert.strictEqual((BigInt(await lpStaking.pendingRewards(1))).toString(), '0');

        });
     });

     describe("# decrementNFTValue()", () => {
        it('should NOT decrease value of NFT if not called by owner of Contract', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(web3.utils.toWei('10', 'ether'), {from: user}));
            const balanceBefore = await lpStaking.getNFTBalance(1);

            await truffleAssert.reverts(lpStaking.decrementNFTValue(1, stakeAmount, {from: owner}));

            const balanceAfter = await lpStaking.getNFTBalance(1);

            assert.strictEqual((BigInt(balanceBefore)).toString(), (BigInt(balanceAfter)).toString());
        });

        it('should NOT decrease value of NFT if not called by owner of NFT', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(web3.utils.toWei('10', 'ether'), {from: user}));
            const balanceBefore = await lpStaking.getNFTBalance(1);

            await truffleAssert.reverts(lpStaking.decrementNFTValue(1, stakeAmount, {from: user}));

            const balanceAfter = await lpStaking.getNFTBalance(1);

            assert.strictEqual((BigInt(balanceBefore)).toString(), (BigInt(balanceAfter)).toString());
        });

        it('should decrease value of NFT if called by platform', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(web3.utils.toWei('10', 'ether'), {from: user}));
            const balanceBefore = await lpStaking.getNFTBalance(1);

            await truffleAssert.passes(lpStaking.decrementNFTValue(1, stakeAmount, {from: testPlatform}));

            const balanceAfter = await lpStaking.getNFTBalance(1);

            assert.strictEqual((BigInt(balanceBefore) - BigInt(stakeAmount)).toString(), (BigInt(balanceAfter)).toString());
        });

        it('should send rewards to owner when function gets called and pending rewards after should be 0', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await truffleAssert.passes(lpStaking.stakeLP(web3.utils.toWei('10', 'ether'), {from: user}));

            let i = 0;
            while(i < 100){
            await helper.advanceBlock();
            i++;
            }

            const userBalanceBefore = BigInt(await token.balanceOf(user));
            const balanceBeforeLP = await lpStaking.getNFTBalance(1);
            console.log(userBalanceBefore);

            let decrement = await lpStaking.decrementNFTValue(1, stakeAmount, {from: testPlatform});

            const userBalanceAfter = BigInt(await token.balanceOf(user));
            const balanceAfterLP = await lpStaking.getNFTBalance(1);
            const expectedRewards = BigInt(decrement.logs[1].args._rewardsClaimed);

            console.log(userBalanceAfter);
            console.log(expectedRewards);

            console.log(BigInt(balanceBeforeLP));
            console.log(BigInt(balanceAfterLP));

            console.log(BigInt(await lpStaking.pendingRewards(1)));

            assert.strictEqual((userBalanceBefore + expectedRewards).toString(), userBalanceAfter.toString());
            assert.strictEqual((BigInt(balanceBeforeLP) - BigInt(stakeAmount)).toString(), (BigInt(balanceAfterLP)).toString());
            assert.strictEqual((BigInt(await lpStaking.pendingRewards(1))).toString(), '0');

        });
     });

     describe("# turnEmergencyWithdrawOn()", () => {
        it('should NOT let a non-owner execute function', async () => {
            await truffleAssert.reverts(lpStaking.turnEmergencyWithdrawOn({from: user}));
        });

        it('should let owner execute function', async () => {
            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
        });

        it('should NOT allow withdraws if function has not been executed', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            const inCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.reverts(lpStaking.unstakeLP(1, {from: user}));

            const stillInCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(stillInCirculation, true);
        });

        it('should allow withdraws if function has not been executed', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            const inCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));

            await truffleAssert.passes(lpStaking.unstakeLP(1, {from: user}));

            const stillInCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(stillInCirculation, false);
        });

        it('should NOT allow deposits if function has been executed', async () => {
            await lp.approve(lpStaking.address, allowance, {from: user});
            await lpStaking.stakeLP(stakeAmount, {from: user});
            const inCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));

            await truffleAssert.passes(lpStaking.unstakeLP(1, {from: user}));

            await truffleAssert.reverts(lpStaking.stakeLP(stakeAmount, {from: user}));

            const stillInCirculation = await lpStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(stillInCirculation, false);
        });

        it('should NOT let function be called twice', async () => {
            await truffleAssert.passes(lpStaking.turnEmergencyWithdrawOn({from: owner}));
            await truffleAssert.reverts(lpStaking.turnEmergencyWithdrawOn({from: owner}));
        });



     });




});
