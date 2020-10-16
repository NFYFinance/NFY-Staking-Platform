const NFYStakingNFT = artifacts.require("NFYStakingNFT");
const NFYStaking = artifacts.require("NFYStaking");
const Token = artifacts.require("Demo");
const truffleAssert = require("truffle-assertions");


contract("NFYStaking", async (accounts) => {

    let owner;
    let rewardPool;
    let user;
    let user2;
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

        initialBalance = 1000;
        stakeAmount = 5;

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
            await truffleAssert.reverts(nfyStaking.stakeNFY(5, {from: user}));
        });

        it('should let a user stake if funds approved', async () => {
            await token.approve(nfyStaking.address, 1000, {from: user});
            await truffleAssert.passes(nfyStaking.stakeNFY(5, {from: user}));
        });

        it('should not allow a user to stake 0 tokens', async () => {
            await token.approve(nfyStaking.address, 1000, {from: user});
            await truffleAssert.reverts(nfyStaking.stakeNFY(0, {from: user}), "Can not stake 0 NFY");
        });

        it('should transfer NFY to contract address', async () => {
            await token.approve(nfyStaking.address, 1000, {from: user});
            const balanceBefore = await token.balanceOf(nfyStaking.address);
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));
            const balanceAfter = await token.balanceOf(nfyStaking.address);
            assert.strictEqual(BigInt(balanceBefore) + BigInt(stakeAmount), BigInt(balanceAfter));
        });

        it('should update NFY balance of user', async () => {
            await token.approve(nfyStaking.address, 1000, {from: user});
            const balanceBefore = await token.balanceOf(user);
            await truffleAssert.passes(nfyStaking.stakeNFY(stakeAmount, {from: user}));
            const balanceAfter = await token.balanceOf(user);
            assert.strictEqual(BigInt(balanceBefore) - BigInt(stakeAmount), BigInt(balanceAfter));
        });

        it('should mint new NFT when new user stakes', async () => {
            await token.approve(nfyStaking.address, 1000, {from: user});
            const transaction = await nfyStaking.stakeNFY(stakeAmount, {from: user});

            assert.strictEqual("MintedToken", transaction.logs[0].event);
            assert.strictEqual(user, transaction.logs[0].args._staker);
            const tokenId = transaction.logs[0].args._tokenId;
            assert.strictEqual(BigInt(1), BigInt(tokenId));
            assert.strictEqual(2, transaction.logs.length);
            assert.strictEqual("StakeCompleted", transaction.logs[1].event);
            assert.strictEqual(user, transaction.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction.logs[1].args._amount));
            assert.strictEqual(BigInt(1), BigInt(transaction.logs[1].args._tokenId));
        });

        it('second stake should mint NFT w id 2 after first stake when new user stakes', async () => {
            await token.approve(nfyStaking.address, 1000, {from: user});
            await token.approve(nfyStaking.address, 1000, {from: user2});
            const transaction1 = await nfyStaking.stakeNFY(stakeAmount, {from: user});
            const transaction2 = await nfyStaking.stakeNFY(stakeAmount, {from: user2});

            assert.strictEqual("MintedToken", transaction1.logs[0].event);
            assert.strictEqual(user, transaction1.logs[0].args._staker);
            const tokenId1 = transaction1.logs[0].args._tokenId;
            assert.strictEqual(BigInt(1), BigInt(tokenId1));
            assert.strictEqual(2, transaction1.logs.length);
            assert.strictEqual("StakeCompleted", transaction1.logs[1].event);
            assert.strictEqual(user, transaction1.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction1.logs[1].args._amount));
            assert.strictEqual(BigInt(1), BigInt(transaction1.logs[1].args._tokenId));

            assert.strictEqual("MintedToken", transaction2.logs[0].event);
            assert.strictEqual(user2, transaction2.logs[0].args._staker);
            const tokenId2 = transaction2.logs[0].args._tokenId;
            assert.strictEqual(BigInt(2), BigInt(tokenId2));
            assert.strictEqual(2, transaction2.logs.length);
            assert.strictEqual("StakeCompleted", transaction2.logs[1].event);
            assert.strictEqual(user2, transaction2.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[1].args._amount));
            assert.strictEqual(BigInt(2), BigInt(transaction2.logs[1].args._tokenId));
        });

        it('should NOT mint new NFT when existing user stakes', async () => {
            await token.approve(nfyStaking.address, 1000, {from: user});
            const transaction = await nfyStaking.stakeNFY(stakeAmount, {from: user});

            assert.strictEqual("MintedToken", transaction.logs[0].event);
            assert.strictEqual(user, transaction.logs[0].args._staker);
            const tokenId = transaction.logs[0].args._tokenId;
            assert.strictEqual(BigInt(1), BigInt(tokenId));
            assert.strictEqual(2, transaction.logs.length);
            assert.strictEqual("StakeCompleted", transaction.logs[1].event);
            assert.strictEqual(user, transaction.logs[1].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction.logs[1].args._amount));
            assert.strictEqual(BigInt(1), BigInt(transaction.logs[1].args._tokenId));

            const transaction2 = await nfyStaking.stakeNFY(stakeAmount, {from: user});

            assert.strictEqual("StakeCompleted", transaction2.logs[0].event);
            assert.strictEqual(1, transaction2.logs.length);
            assert.strictEqual(user, transaction2.logs[0].args._staker);
            assert.strictEqual(BigInt(stakeAmount), BigInt(transaction2.logs[0].args._amount));
            assert.strictEqual(BigInt(1), BigInt(transaction2.logs[0].args._tokenId));
        });

     });

     describe("# unstakeNFY()", () => {

     });



});