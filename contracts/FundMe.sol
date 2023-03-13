//get funds from users
//withdraw funds
// Set a minimum funding value in USD
// SPDX-License-Identifier: MIT

// Pragma
pragma solidity ^0.8.8;
//Imports

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

// Error code
error FundMe__NotOwner();

//Interfaces, Libraries, Contracts

/** @title A contract for crowd funding
 * @author David Raigoza
 * @notice This contract is to demo a sample funding contract
 * @dev This implements price feeds to our
 */
contract FundMe {
    //Type declarations
    using PriceConverter for uint256;

    //State variables!
    mapping(address => uint256) public addressToAmountFunded;
    address[] public funders;
    uint256 public constant MINIMUM_USD = 50 * 10 ** 18;
    address public immutable i_owner;

    AggregatorV3Interface public priceFeed;

    modifier onlyOnwer() {
        //require(msg.sender == i_owner, "Sender is not owner");
        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        }
        _;
    }

    // Functions Order:
    //// constructor
    //// receive
    //// fallback
    //// external
    //// public
    //// internal
    //// private
    //// view / pure

    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    /**
     *@notice This contract is to demo a sample funding contract
     * @dev This implements price feeds as our library
     */

    function fund() public payable {
        
        require(
            msg.value.getConversionRate(priceFeed) >= MINIMUM_USD,
            "You need to spend more ETH!"
        );
        // require(PriceConverter.getConversionRate(msg.value) >= MINIMUM_USD, "You need to spend more ETH!");
        addressToAmountFunded[msg.sender] += msg.value;
        funders.push(msg.sender);
    }

    function withdraw() public onlyOnwer {
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            addressToAmountFunded[funder] = 0;
        }

        // set the length of the funders array to 1 and leave the first element empty
        funders = new address[](1);

        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call Failed");
    }
    // function cheaperWithdraw() public payable onlyOnwer {
    //     address[] memory funders = s_funders;
    // } 
    //COMEBACK TOMORRROW TO MAKE IT CHEAPER AND OPTIMIZE IT
}
