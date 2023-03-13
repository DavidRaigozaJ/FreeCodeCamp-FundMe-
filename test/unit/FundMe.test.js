const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")
const { EtherscanProvider } = require("@ethersproject/providers")

describe("FundMe", function () {
    // define the contract and price feed variables for use in the tests
    let fundMe
    let priceFeed

    // define the deployer address variable for use in the tests
    let deployer
    const sendValue = "1000000000000000000"

    // deploy the contract and price feed before each test
    beforeEach(async function () {
        await deployments.fixture(["all"])
        const { deployer: deployerAddress } = await getNamedAccounts()
        deployer = deployerAddress
        fundMe = await ethers.getContract("FundMe")
        priceFeed = await ethers.getContract("MockV3Aggregator", deployer)
    })

    describe("constructor", function () {
        it("sets the aggregator addresses correctly", async function () {
            assert.equal(await fundMe.priceFeed(), priceFeed.address)
        })

        describe("fund", async function () {
            it("Fails if you don't send enough ETH", async function () {
                await expect(fundMe.fund()).to.be.revertedWith(
                    "You need to spend more ETH!"
                )
            })
            it("updated the amount funded data structure", async function () {
                await fundMe.fund({ value: sendValue })
                const response = await fundMe.addressToAmountFunded(deployer)
                assert.equal(response.toString(), sendValue.toString())
            })

            it("Adds funder to array of funders", async function () {
                await fundMe.fund({ value: sendValue })
                const funder = await fundMe.funders(0)
                assert.equal(funder, deployer)
            })
        })
        describe("withdraw", async function () {
            beforeEach(async function () {
                await fundMe.fund({ value: sendValue })
            })

            it("withdraw ETH from a single funder", async function () {
                // Arrange
                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)

                // Act
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)

                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                )

                // gasCost

                // Assert
                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingFundMeBalance
                        .add(startingDeployerBalance)
                        .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )
            })
            it("allows us to withdraw with multiple founders", async function () {
                const accounts = await ethers.getSigners()
                for (let i = 1; i < 6; i++) {
                    const fundMeConnectedContract = await fundMe.connect(
                        accounts[i]
                    )
                    await fundMeConnectedContract.fund({ value: sendValue })
                }
                const startingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const startingDeployerBalance =
                    await fundMe.provider.getBalance(deployer)
                //Act
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const endingFundMeBalance = await fundMe.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await fundMe.provider.getBalance(
                    deployer
                )

                //Assert

                assert.equal(endingFundMeBalance, 0)
                assert.equal(
                    startingFundMeBalance
                        .add(startingDeployerBalance)
                        .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )

                //Make sure funders are reset properly

                await expect(fundMe.funders(0)).to.be.reverted

                for (i = 1; i < 6; i++) {
                    assert.equal(
                        await fundMe.addressToAmountFunded(accounts[i].address),
                        0
                    )
                }
            })
        })
    })
})
