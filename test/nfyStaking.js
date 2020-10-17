const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const Token = artifacts.require("Demo");
const truffleAssert = require("truffle-assertions");


contract("NFYStaking", async (accounts) => {

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
        nfyStaking = await NFYStaking.new(token.address, nfyStakingNFT.address, nfyStakingNFT.address, rewardPool);

        // Add NFY Staking contract as a platform address
        await nfyStakingNFT.addPlatformAddress(nfyStaking.address);

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
            assert.strictEqual(nfyStakingNFT.address, await nfyStaking.taking());
        });

        it('should set reward pool address properly', async () => {
            assert.strictEqual(rewardPool, await nfyStaking.rewardPool());
        });

        it('should set owner properly', async () => {
            assert.strictEqual(owner, await nfyStaking.owner());
        });

     });

     describe("# getNFTBalance()", () => {

     });

     describe("# checkIfNFTInCirculation()", () => {

     });

     describe("# stakeNFY()", () => {

        /*it('should set user\'s initial NFY balance to 1000', async () => {
            assert.strictEqual(initialBalance, await token.balanceOf(user));
        });*/

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

        it('should not allow a user to stake 0 tokens', async () => {
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

            assert.strictEqual("StakeCompleted", transaction2.logs[0].event);
            assert.strictEqual(1, transaction2.logs.length);
            assert.strictEqual(user, transaction2.logs[0].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[0].args._amount));
            assert.strictEqual(1, transaction2.logs[0].args._tokenId.toNumber());

            const secondStake = transaction2.logs[0].args._totalStaked.toString();
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

            assert.strictEqual("StakeCompleted", transaction3.logs[0].event);
            assert.strictEqual(1, transaction3.logs.length);
            assert.strictEqual(user, transaction3.logs[0].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction3.logs[0].args._amount));
            assert.strictEqual(2, transaction3.logs[0].args._tokenId.toNumber());

            const secondStake = transaction3.logs[0].args._totalStaked.toString();
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
            assert.strictEqual(1, unstake.logs.length);
            console.log(BigInt(unstake.logs[0].args._amount));

            const balanceAfter = await token.balanceOf(user);
            console.log(BigInt(balanceAfter));
            console.log(BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(95)));

            assert.strictEqual(BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(95)), BigInt(balanceAfter));
        });

        it('should update reward pool after withdraw', async () => {
            await token.approve(nfyStaking.address, allowance, {from: user});
            const stake = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const stake2 = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const tokenId = stake2.logs[0].args._tokenId.toNumber();
            const amountStaked = BigInt(stake2.logs[0].args._totalStaked);

            const balanceBefore = await token.balanceOf(rewardPool);
            console.log(BigInt(balanceBefore));

            const unstake = await (nfyStaking.unstakeNFY(tokenId, {from: user}));
            assert.strictEqual(1, unstake.logs.length);
            console.log(BigInt(unstake.logs[0].args._amount));

            const balanceAfter = await token.balanceOf(rewardPool);
            console.log(BigInt(balanceAfter));
            console.log(BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(5)));

            assert.strictEqual(BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(5)), BigInt(balanceAfter));
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
            assert.strictEqual(1, unstake.logs.length);
            console.log(BigInt(unstake.logs[0].args._amount));

            const balanceAfter = await token.balanceOf(user2);
            console.log(BigInt(balanceAfter));
            console.log(BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(95)));

            assert.strictEqual(BigInt(balanceBefore) + (BigInt(amountStaked) / BigInt(100) * BigInt(95)), BigInt(balanceAfter));
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
            assert.strictEqual(1, unstake.logs.length);
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
            assert.strictEqual(BigInt(balanceBefore3) + (BigInt(amountStaked) / BigInt(100) * BigInt(95)), BigInt(balanceAfter3));
        });

     });



});