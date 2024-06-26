// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract RestaurantTab {
    event PartyMemberAdded(address partyMember, uint timestamp);
    event fundsUsed(
        address indexed partyMember,
        uint amountSpent,
        uint timestamp
    );
    event FundsAdded(
        address indexed partyMember,
        uint amountAdded,
        uint timestamp
    );
    event TabClosedAndBillPaid(
        address indexed restaurant,
        address indexed tabOwner,
        uint amountTabOwnerRefunded,
        uint timestamp
    );
    struct PartyMembers {
        address[] list;
        mapping(address => bool) isMember;
    }
    PartyMembers party;
    address payable public owner; // person who opens the tab, and can add funds.
    address payable public restaurant; // This is the restaurant that receives the funds after the tab is closed.
    uint256 public tabFunds;
    bool public isOpen;
    modifier tabIsOpen() {
        require(isOpen == true, "tab is not open.");
        _;
    }
    modifier isValidRestaurant(address _restaurant) {
        require(_restaurant != address(0), "not a valid restaurant");
        require(_restaurant != msg.sender, "user cannot be the same as the restaurant.");
        _;
    }
    modifier userIsPartyMember() {
        require(
            party.isMember[msg.sender] == true,
            "user is not part of this tab's party."
        );
        _;
    }
    modifier isTabOwner() {
        require(msg.sender == owner, "you did not open the tab.");
        _;
    }
    modifier expenseWithinLimits(uint256 expenseAmount) {
        require(
            tabFunds >= expenseAmount,
            "funds remaining will not cover the expense."
        );
        _;
    }

    constructor(
        address _restaurant,
        address[] memory friends
    ) payable isValidRestaurant(_restaurant) {
        isOpen = true;
        owner = payable(msg.sender);
        restaurant = payable(_restaurant);
        tabFunds += msg.value;
        addUserToParty(msg.sender);
        for (uint256 i; i < friends.length; i++) {
            addUserToParty(friends[i]);
        }
    }

    function addFunds() external payable tabIsOpen isTabOwner {
        tabFunds += msg.value;
        emit FundsAdded(msg.sender, msg.value, block.timestamp);
    }

    function addUserToParty(address member) public tabIsOpen isTabOwner {
        require(
            member != restaurant,
            "cannot add the restaurant to your party."
        );
        if (party.isMember[member] == true) return;
        party.isMember[member] = true;
        party.list.push(member);
        emit PartyMemberAdded(member, block.timestamp);
    }

    function removeUserFromParty(address member) external tabIsOpen isTabOwner {
        if (party.isMember[member] == false) return;
        delete party.isMember[member];
        uint idxToSwap = 0;
        for (uint i; i < party.list.length; i++) {
            if (party.list[i] == member) {
                idxToSwap = i;
                break;
            }
        }
        address addressToRemove = party.list[idxToSwap];
        address lastAddress = party.list[party.list.length - 1];
        party.list[idxToSwap] = lastAddress;
        party.list[party.list.length - 1] = addressToRemove;
        party.list.pop();
    }

    function spendFunds(
        uint256 price
    ) external tabIsOpen userIsPartyMember expenseWithinLimits(price) {
        tabFunds -= price;
        (bool sent, ) = payable(restaurant).call{value: price}("");
        require(sent, "payment to restaurant failed.");
        emit fundsUsed(msg.sender, price, block.timestamp);
    }

    function getRemainingSpendableAmount() public view returns (uint256) {
        return tabFunds;
    }

    function closeTab() private isTabOwner {
        isOpen = false;
    }

    function closeBillAndPay() public isTabOwner {
        closeTab();
        uint256 amountRefundableToOwner = getRemainingSpendableAmount();
        tabFunds = 0;
        (bool refundSent, ) = payable(owner).call{
            value: amountRefundableToOwner
        }("");
        require(refundSent, "refund payment back to owner failed.");
        emit TabClosedAndBillPaid(
            restaurant,
            owner,
            amountRefundableToOwner,
            block.timestamp
        );
    }

    function getPartyMembers() external view returns (address[] memory) {
        return party.list;
    }

    function getIsMemberInParty(address member) public view returns (bool) {
        return party.isMember[member];
    }
}
