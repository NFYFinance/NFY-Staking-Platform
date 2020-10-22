const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const Token = artifacts.require("Demo");
const truffleAssert = require("truffle-assertions");
const RewardPool = artifacts.require("RewardPool");
const helper = require('./utils/utils.js');

const SECONDS_IN_DAY = 86400;



contract("NFYStaking", async (accounts) => {

    let owner;
    let rewardPool;
    let user;
    let user2;
    let user3;
    let rewardTokensBefore
    let token;
    let nfyStakingNFT;
    let nfyStaking;
    let initialBalance;
    let stakeAmount;

     before(async () => {
        // Owner address
        owner = accounts[1];

        user = accounts[3];

        user2 = accounts[4];

        user3 = accounts[5];

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

        // Token deployment
        nfyStakingNFT = await NFYStakingNFT.new();

        rewardPool = await RewardPool.new(token.address);

        token.faucet(rewardPool.address, rewardTokens);

        // Funding deployment
        nfyStaking = await NFYStaking.new(token.address, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool.address, 1000);

        // Add NFY Staking contract as a platform address
        await nfyStakingNFT.addPlatformAddress(nfyStaking.address);

        await rewardPool.allowTransferToStaking(nfyStaking.address, rewardTokens);

        // Transfer ownership to secured secured account
        await nfyStakingNFT.transferOwnership(owner);
        await nfyStaking.transferOwnership(owner);

        await token.faucet(user, initialBalance);
        await token.faucet(user2, initialBalance);
        await token.faucet(user3, initialBalance);
     });

     describe("# constructor()", () => {

        it('should set NFY Token properly', async () => {
            assert.strictEqual(token.address, await nfyStaking.NFYToken());
        });

        it("Sets the NFY NFT interface properly", async () => {
           assert.strictEqual(nfyStakingNFT.address, await nfyStaking.StakingNFT());
        });

        it('should set staking address properly', async () => {
            assert.strictEqual(nfyStakingNFT.address, await nfyStaking.staking());
        });

        it('should set reward pool address properly', async () => {
            assert.strictEqual(rewardPool.address, await nfyStaking.rewardPool());
        });

        it('should set owner properly', async () => {
            assert.strictEqual(owner, await nfyStaking.owner());
        });

        it('should set daily reward % properly', async () => {
            assert.strictEqual('1000', (BigInt(await nfyStaking.dailyReward())).toString());
        });

     });

     describe("# getRewardPerBlock()", () => {
        it('should calculate reward per block properly', async () => {
            const rewardPoolBalance = await token.balanceOf(rewardPool.address);
            const expectedReward = rewardPoolBalance / 6500 / 1000;
            const actualReward = await nfyStaking.getRewardPerBlock();

            assert.strictEqual(BigInt(expectedReward), BigInt(actualReward));
        });

     });

     describe("# setDailyReward()", () => {

        it('should NOT allow a non-owner to set daily reward %', async () => {
            await truffleAssert.reverts(nfyStaking.setDailyReward(2000, {from: user}));
        });

        it('should allow owner to set daily reward %', async () => {
            assert.strictEqual('1000', (BigInt(await nfyStaking.dailyReward())).toString());
            await truffleAssert.passes(nfyStaking.setDailyReward(2000, {from: owner}));
            assert.strictEqual('2000', (BigInt(await nfyStaking.dailyReward())).toString());
        });

     });

     describe("# getNFTBalance()", () => {
        it('should return 0 if the NFT does not exist', async () => {
            assert.strictEqual(0, (await nfyStaking.getNFTBalance(1)).toNumber());
        });
     });

     describe("# checkIfNFTInCirculation()", () => {

        it('should NOT be in circulation if it has not been minted yet', async () => {
            const inCirculation = await nfyStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, false);
        });

        it('should be in circulation if it has been minted', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            const inCirculation = await nfyStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, true);
        });

        it('should NOT be in circulation if it has been unstaked', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            const inCirculation = await nfyStaking.checkIfNFTInCirculation(1);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.passes(nfyStaking.unstakeAll({from: user}));
            const notInCirculation = await nfyStaking.checkIfNFTInCirculation(1);

            assert.strictEqual(notInCirculation, false);
        });

     });

     describe("# pendingRewards()", () => {
        it('should NOT have any pending rewards if not minted yet', async () => {
            assert.strictEqual(0, (await nfyStaking.pendingRewards(1)).toNumber());
        });

        it('should calculate proper rewards when block has passes', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            await helper.advanceBlock();
            assert.strictEqual(BigInt(await nfyStaking.getRewardPerBlock()), BigInt(await nfyStaking.pendingRewards(1)));

            await helper.advanceBlock();
            assert.strictEqual(BigInt(await nfyStaking.getRewardPerBlock() * 2), BigInt(await nfyStaking.pendingRewards(1)));
        });


     });

     describe("# getTotalRewards()", () => {
        it('should NOT have any rewards for a user without a NFT', async () => {
            assert.strictEqual(0, (await nfyStaking.getTotalRewards(user)).toNumber());
        });

        it('should get total rewards of an address with one NFT', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            await helper.advanceBlock();
            assert.strictEqual(BigInt(await nfyStaking.getRewardPerBlock()), BigInt(await nfyStaking.getTotalRewards(user)));

            await helper.advanceBlock();
            assert.strictEqual(BigInt(await nfyStaking.getRewardPerBlock() * 2), BigInt(await nfyStaking.getTotalRewards(user)));
        });

        it('should show total pending rewards if user has multiple NFTs', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await token.approve(nfyStaking.address, allowance, {from: user2});

            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            await helper.advanceBlock();

            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user2}));

            let i = 0;
            while(i < 5){
            await helper.advanceBlock();
            i++;
            }

            await nfyStakingNFT.transferFrom(user, user2, 1, {from: user});
            const nft1 = BigInt(await nfyStaking.pendingRewards(2));
            const nft2 = BigInt(await nfyStaking.pendingRewards(1));
            const user2Rewards = BigInt(await nfyStaking.getTotalRewards(user2));

            assert.strictEqual(nft1 + nft2, user2Rewards);
            assert.strictEqual(0, (await nfyStaking.getTotalRewards(user)).toNumber());
        });
     });

     describe("# getTotalBalance()", () => {
        it('should NOT have any balance for a user without a NFT', async () => {
            assert.strictEqual(0, (await nfyStaking.getTotalBalance(user)).toNumber());
        });

        it('should get total balance of an address with one NFT', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));
            assert.strictEqual(BigInt(stakeAmount), BigInt(await nfyStaking.getTotalBalance(user)));

            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));
            assert.strictEqual(BigInt(stakeAmount * 2), BigInt(await nfyStaking.getTotalBalance(user)));
        });

        it('should show total balance if user has multiple NFTs', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await token.approve(nfyStaking.address, allowance, {from: user2});

            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user2}));

            await nfyStakingNFT.transferFrom(user, user2, 1, {from: user});
            const nft1 = BigInt(await nfyStaking.getNFTBalance(2));
            const nft2 = BigInt(await nfyStaking.getNFTBalance(1));
            const user2Balance = BigInt(await nfyStaking.getTotalBalance(user2));

            assert.strictEqual(nft1 + nft2, user2Balance);
            assert.strictEqual(0, (await nfyStaking.getTotalBalance(user)).toNumber());
        });
     });

     describe("# getAPY()", () => {

        it('should return apy properly', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));

            let rewardPerYear = (BigInt(await nfyStaking.getRewardPerBlock() * 6500 * 366));
            let expectedAPY = (rewardPerYear / (BigInt(await nfyStaking.totalStaked())) * BigInt(1e20)).toString();
            let actualAPY = (BigInt(await nfyStaking.getAPY())).toString();

            console.log(expectedAPY);
            console.log(actualAPY);

            assert.strictEqual(expectedAPY, actualAPY);

        });

        it('apy should be 36500% * decimals if 60 NFY is staked staking', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(web3.utils.toWei('60', 'ether'), {from: user}));
            console.log(BigInt(await nfyStaking.getAPY()));
            console.log((web3.utils.toWei('36500', 'ether')));

            assert.strictEqual(web3.utils.toWei('36500', 'ether'), (BigInt(await nfyStaking.getAPY())).toString());
        });

        it('apy should be 6000% * decimals if 365 NFY is staked staking', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await token.approve(nfyStaking.address, allowance, {from: user2});

            await truffleAssert.passes(nfyStaking.stakeNFY(web3.utils.toWei('300', 'ether'), {from: user}));
            await truffleAssert.passes(nfyStaking.stakeNFY(web3.utils.toWei('65', 'ether'), {from: user}));

            console.log(BigInt(await nfyStaking.getAPY()));
            console.log((web3.utils.toWei('6000', 'ether')));

            assert.strictEqual(web3.utils.toWei('6000', 'ether'), (BigInt(await nfyStaking.getAPY())).toString());
        });

     });

     describe("# stakeNFY()", () => {

        it('should REVERT if user tries to stake with out allowing', async () => {
            await truffleAssert.reverts(nfyStaking.stakeNFY(stakeAmount, {from: user}));
        });

        it('should NOT let a user stake if their balance is not enough', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.reverts(nfyStaking.stakeNFY(moreThanBalance, {from: user}));
        });

        it('should let a user stake if funds approved', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));
        });

        it('should NOT allow a user to stake 0 tokens', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await truffleAssert.reverts(nfyStaking.stakeNFY(0, {from: user}), "Can not stake 0 NFY");
        });

        it('should transfer NFY to contract address', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const balanceBefore = await token.balanceOf(nfyStaking.address);
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));
            const balanceAfter = await token.balanceOf(nfyStaking.address);
            assert.strictEqual(BigInt(balanceBefore) + BigInt(stakeAmount), BigInt(balanceAfter));
        });

        it('should update NFY balance of user', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const balanceBefore = await token.balanceOf(user);
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));
            const balanceAfter = await token.balanceOf(user);
            assert.strictEqual(BigInt(balanceBefore) - BigInt(stakeAmount), BigInt(balanceAfter));
        });

        it('should mint new NFT when new user stakes', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const transaction = await nfyStaking.stakeNFY(stakeAmount, {from: user});

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
            await token.approve(nfyStaking.address, allowance, {from: user});
            await token.approve(nfyStaking.address, allowance, {from: user2});
            const transaction1 = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const transaction2 = await nfyStaking.stakeNFY(stakeAmount, {from: user2});

            assert.strictEqual("MintedToken", transaction1.logs[0].event);
            assert.strictEqual(user, transaction1.logs[0].args._staker);

            assert.strictEqual(1, transaction1.logs[0].args._tokenId.toNumber());
            assert.strictEqual(2, transaction1.logs.length);
            assert.strictEqual("StakeCompleted", transaction1.logs[1].event);
            assert.strictEqual(user, transaction1.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction1.logs[1].args._amount));
            assert.strictEqual(1, transaction1.logs[1].args._tokenId.toNumber());

            assert.strictEqual("MintedToken", transaction2.logs[0].event);
            assert.strictEqual(user2, transaction2.logs[0].args._staker);

            assert.strictEqual(2, transaction2.logs[0].args._tokenId.toNumber());
            assert.strictEqual(2, transaction2.logs.length);
            assert.strictEqual("StakeCompleted", transaction2.logs[1].event);
            assert.strictEqual(user2, transaction2.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[1].args._amount));
            assert.strictEqual(2, transaction2.logs[1].args._tokenId.toNumber());
        });

        it('should NOT mint new NFT when existing user stakes', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const transaction = await nfyStaking.stakeNFY(stakeAmount, {from: user});

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

            const transaction2 = await nfyStaking.stakeNFY(stakeAmount, {from: user});

            assert.strictEqual("RewardsClaimed", transaction2.logs[0].event);
            assert.strictEqual("StakeCompleted", transaction2.logs[1].event);
            assert.strictEqual(2, transaction2.logs.length);
            assert.strictEqual(user, transaction2.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[1].args._amount));
            assert.strictEqual(1, transaction2.logs[1].args._tokenId.toNumber());

            const secondStake = transaction2.logs[1].args._totalStaked.toString();
            console.log(secondStake);
            console.log((stakeAmount * 2).toString());

            assert.strictEqual((stakeAmount * 2).toString(), secondStake);
        });

        it('should mint a new NFT if user stakes and sent their NFT to another address', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const transaction = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();
            console.log(await nfyStakingNFT.ownerOf(tokenId));

            await nfyStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await nfyStakingNFT.ownerOf(tokenId));

            const transaction2 = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId2 = transaction2.logs[1].args._tokenId.toNumber();
            console.log(await nfyStakingNFT.ownerOf(tokenId2));
            assert.strictEqual(2, transaction2.logs.length);

            assert.strictEqual("MintedToken", transaction2.logs[0].event);
            assert.strictEqual(user, transaction2.logs[0].args._staker);

            assert.strictEqual(2, transaction2.logs[0].args._tokenId.toNumber());
            assert.strictEqual("StakeCompleted", transaction2.logs[1].event);
            assert.strictEqual(user, transaction2.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[1].args._amount));
            assert.strictEqual(2, transaction2.logs[1].args._tokenId.toNumber());

            const transaction3 = await nfyStaking.stakeNFY(stakeAmount, {from: user});

            assert.strictEqual("RewardsClaimed", transaction3.logs[0].event);
            assert.strictEqual("StakeCompleted", transaction3.logs[1].event);
            assert.strictEqual(2, transaction3.logs.length);
            assert.strictEqual(user, transaction3.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction3.logs[1].args._amount));
            assert.strictEqual(2, transaction3.logs[1].args._tokenId.toNumber());

            const secondStake = transaction3.logs[1].args._totalStaked.toString();
            console.log(secondStake);
            console.log((stakeAmount * 2).toString());

            assert.strictEqual((stakeAmount * 2).toString(), secondStake);
        });

        it('should update balance of new NFT after a user sends their original', async () => {

            await token.approve(nfyStaking.address, allowance, {from: user});
            const transaction = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();
            console.log(await nfyStakingNFT.ownerOf(tokenId));

            await nfyStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await nfyStakingNFT.ownerOf(tokenId));

            const transaction2 = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId2 = transaction2.logs[1].args._tokenId.toNumber();
            console.log(await nfyStakingNFT.ownerOf(tokenId2));
            assert.strictEqual(2, transaction2.logs.length);

            const transaction3 = await nfyStaking.stakeNFY(stakeAmount, {from: user});

            const balanceUpdated = await nfyStaking.getNFTBalance(tokenId2);
            console.log(balanceUpdated.toString());
            console.log((stakeAmount * 2).toString());

            assert.strictEqual((stakeAmount * 2).toString(), balanceUpdated.toString());
        });

        it('should update totalStaked balance after a stake', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const totalStakedBefore = await nfyStaking.totalStaked();
            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});

            const totalStakedAfter = await nfyStaking.totalStaked();

            assert.strictEqual((BigInt(totalStakedBefore)).toString(), '0');
            assert.strictEqual((BigInt(totalStakedAfter)).toString(), (BigInt(stakeAmount * 2)).toString());
            assert.strictEqual((BigInt(totalStakedBefore) + BigInt(stakeAmount * 2)).toString(), (BigInt(totalStakedAfter)).toString());
        });

     });

     describe("# unstakeNFY()", () => {
        it('should NOT let a user unstake a token that is not theirs', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});

            await truffleAssert.reverts(nfyStaking.unstakeNFY(1, {from: user2}), "User is not owner of token");
        });

        it('should let a user unstake a token if it is theirs', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const transaction = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();
            console.log(tokenId);
            console.log(await nfyStakingNFT.ownerOf(1));
            console.log(user);

            const inCirculation = await nfyStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(inCirculation, true);

            await truffleAssert.passes(nfyStaking.unstakeNFY(tokenId, {from: user}));

        });

        it('should NOT let a user unstake a token that has already been unstaked', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const transaction = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = transaction.logs[1].args._tokenId.toNumber();

            await truffleAssert.passes(nfyStaking.unstakeNFY(tokenId, {from: user}));

            const notInCirculation = await nfyStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(notInCirculation, false);

            await truffleAssert.reverts(nfyStaking.unstakeNFY(1, {from: user}));
        });

        it('should update balance after withdraw has been completed', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const stake = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            assert.strictEqual(2, stake.logs.length);

            const balanceBefore = await token.balanceOf(user);
            console.log(BigInt(balanceBefore));

            const unstake = await (nfyStaking.unstakeNFY(tokenId, {from: user}));
            assert.strictEqual(2, unstake.logs.length);
            console.log(BigInt(unstake.logs[0].args._amount));

            const rewards = BigInt(unstake.logs[1].args._rewardsClaimed);

            const balanceAfter = await token.balanceOf(user);
            console.log(BigInt(balanceAfter));
            console.log(BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(95)));

            assert.strictEqual((BigInt(balanceBefore) + rewards + (BigInt(amountStaked) / BigInt(100) * BigInt(95))).toString(), (BigInt(balanceAfter)).toString());
        });

        it('should update reward pool after withdraw', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const balanceBefore = await token.balanceOf(rewardPool.address);
            const stake = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            console.log(BigInt(balanceBefore));

            const unstake = await (nfyStaking.unstakeNFY(tokenId, {from: user}));
            assert.strictEqual(2, unstake.logs.length);
            console.log(BigInt(unstake.logs[0].args._amount));
            const rewards = BigInt(unstake.logs[1].args._rewardsClaimed);

            const balanceAfter = await token.balanceOf(rewardPool.address);

            const balanceAfterShouldBe = (BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(5)) - rewards);
            const balanceAfterShouldBeToString = balanceAfterShouldBe.toString();
            console.log(BigInt(balanceAfter.toString()));
            console.log(balanceAfterShouldBeToString);
            console.log(rewards.toString());

            assert.strictEqual(balanceAfterShouldBeToString, balanceAfter.toString());
        });

        it('should set user nft Token Id to 0 after unstake', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenIdBefore = await nfyStakingNFT.nftTokenId(user);
            console.log(tokenIdBefore.toNumber());
            assert.strictEqual(1, tokenIdBefore.toNumber());

            await (nfyStaking.unstakeNFY(tokenIdBefore, {from: user}));
            const tokenIdAfter = await nfyStakingNFT.nftTokenId(user);
            console.log(tokenIdAfter.toNumber());
            assert.strictEqual(0, tokenIdAfter.toNumber());
        });

        it('should mint a user a new nft if they had already unstaked', async() => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const stake1Id = await nfyStakingNFT.nftTokenId(user);
            console.log(stake1Id.toNumber());
            assert.strictEqual(1, stake1Id.toNumber());

            await (nfyStaking.unstakeNFY(stake1Id, {from: user}));
            const unstake1Id = await nfyStakingNFT.nftTokenId(user);
            console.log(unstake1Id.toNumber());
            assert.strictEqual(0, unstake1Id.toNumber());

            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const stake2Id = await nfyStakingNFT.nftTokenId(user);
            console.log(stake2Id.toNumber());
            assert.strictEqual(2, stake2Id.toNumber());

            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            stake3Id = await nfyStakingNFT.nftTokenId(user);
            console.log(stake3Id.toNumber());
            assert.strictEqual(stake3Id.toNumber(), stake2Id.toNumber());

            await (nfyStaking.unstakeNFY(stake3Id, {from: user}));
            const unstake2Id = await nfyStakingNFT.nftTokenId(user);
            console.log(unstake2Id.toNumber());
            assert.strictEqual(0, unstake2Id.toNumber());
        });

        it('should set NFT balance to 0 after unstaked', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});

            const tokenId = await nfyStakingNFT.nftTokenId(user);

            const getNFTBalanceBefore = await nfyStaking.getNFTBalance(tokenId);
            assert.strictEqual(BigInt(stakeAmount), BigInt(getNFTBalanceBefore));

            await nfyStaking.unstakeNFY(tokenId, {from: user});
            const getNFTBalanceAfter = await nfyStaking.getNFTBalance(tokenId);
            assert.strictEqual(BigInt(0), BigInt(getNFTBalanceAfter));

        });

        it('should set NFT inCirculation bool to false after unstaked', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});

            const tokenId = await nfyStakingNFT.nftTokenId(user);
            const inCirculation = await nfyStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(inCirculation, true);

            await nfyStaking.unstakeNFY(tokenId, {from: user});
            const notInCirculation = await nfyStaking.checkIfNFTInCirculation(tokenId);
            assert.strictEqual(notInCirculation, false);
        });

        it('should allow a user to unstake a token that has been sent to them and update their balance', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const stake = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            assert.strictEqual(2, stake.logs.length);

            await nfyStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await nfyStakingNFT.ownerOf(tokenId));

            const balanceBefore = await token.balanceOf(user2);
            console.log(BigInt(balanceBefore));

            const unstake = await (nfyStaking.unstakeNFY(tokenId, {from: user2}));
            const rewards = BigInt(unstake.logs[1].args._rewardsClaimed);

            assert.strictEqual(2, unstake.logs.length);
            console.log(BigInt(unstake.logs[0].args._amount));

            const balanceAfter = await token.balanceOf(user2);
            console.log(BigInt(balanceAfter));
            console.log(BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(95)));

            assert.strictEqual((BigInt(balanceBefore) + rewards +  (BigInt(amountStaked) / BigInt(100) * BigInt(95))).toString(), (BigInt(balanceAfter).toString()));
        });

        it('should NOT allow a user to unstake a token that they have sent', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const stake = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            assert.strictEqual(2, stake.logs.length);

            await nfyStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await nfyStakingNFT.ownerOf(tokenId));

            await truffleAssert.reverts(nfyStaking.unstakeNFY(tokenId, {from: user}));

            await truffleAssert.passes(nfyStaking.unstakeNFY(tokenId, {from: user2}));
        });

        it('should let owner unstake if the NFT is sent multiple times', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const stake = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = stake.logs[1].args._tokenId.toNumber();
            const amountStaked = BigInt(stake.logs[1].args._totalStaked);

            assert.strictEqual(2, stake.logs.length);

            await nfyStakingNFT.transferFrom(user, user2, tokenId, {from: user});
            console.log(await nfyStakingNFT.ownerOf(tokenId));

            await nfyStakingNFT.transferFrom(user2, user3, tokenId, {from: user2});
            console.log(await nfyStakingNFT.ownerOf(tokenId));

            const balanceBefore1 = await token.balanceOf(user);
            console.log(BigInt(balanceBefore1));

            const balanceBefore2 = await token.balanceOf(user2);
            console.log(BigInt(balanceBefore2));

            const balanceBefore3 = await token.balanceOf(user3);
            console.log(BigInt(balanceBefore3));

            await truffleAssert.reverts(nfyStaking.unstakeNFY(tokenId, {from: user}));
            await truffleAssert.reverts(nfyStaking.unstakeNFY(tokenId, {from: user2}));
            const unstake = await(nfyStaking.unstakeNFY(tokenId, {from: user3}));
            const rewards = BigInt(unstake.logs[1].args._rewardsClaimed);

            assert.strictEqual(2, unstake.logs.length);
            console.log(BigInt(unstake.logs[0].args._amount));

            const balanceAfter1 = await token.balanceOf(user);
            const balanceAfter2 = await token.balanceOf(user2);
            const balanceAfter3 = await token.balanceOf(user3);

            console.log(BigInt(balanceAfter1));
            console.log(BigInt(balanceAfter2));
            console.log(BigInt(balanceAfter3));

            console.log(BigInt(balanceBefore3) + (BigInt(amountStaked) / BigInt(100) * BigInt(95)));

            assert.strictEqual(BigInt(balanceBefore1), (BigInt(balanceAfter1)));
            assert.strictEqual(BigInt(balanceBefore2), (BigInt(balanceAfter2)));
            assert.strictEqual((BigInt(balanceBefore3) + rewards + (BigInt(amountStaked) / BigInt(100) * BigInt(95))).toString(), (BigInt(balanceAfter3)).toString());
        });

        it('should update totalStaked balance after an unstake', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});
            await nfyStaking.stakeNFY(stakeAmount, {from: user});

            const totalStakedBefore = await nfyStaking.totalStaked();

            await nfyStaking.unstakeNFY(1, {from: user});

            const totalStakedAfter = await nfyStaking.totalStaked();

            assert.strictEqual((BigInt(totalStakedBefore)).toString(), (BigInt(stakeAmount * 2)).toString());
            assert.strictEqual((BigInt(totalStakedAfter)).toString(), '0');
            assert.strictEqual((BigInt(totalStakedBefore).toString()), ((BigInt(totalStakedAfter)) + BigInt(stakeAmount * 2)).toString());
        });

     });




});
