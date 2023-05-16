pragma solidity ^0.8.9;

/*
1. User will be able to create an account and add other users as joint owners.
2. Only owners of the account will be able to deposit money to the account.
3. Only owners of the account will be able to withdraw money from it. A withdraw
   request will need to be made first and then approved by the account owners
   before money can be withdrawn from the account.
*/

contract BankAccount {
    struct Account {
        address[] owners;
    }

    mapping(uint => Account) accounts;
    mapping(address => uint) userAccountsCounter;
    uint currentAccountId;

    modifier canCreateAccount(address[] memory otherOwners) {
        require(
            otherOwners.length < 4,
            "An account can't have more than 4 owners."
        );
        require(
            userAccountsCounter[msg.sender] < 3,
            "You can't own more than 3 accounts."
        );

        for (uint i = 0; i < otherOwners.length; i++) {
            require(
                otherOwners[i] != msg.sender,
                "You account will be automatically added to the account owners."
            );
            for (uint j = i + 1; j < otherOwners.length; j++) {
                require(
                    otherOwners[i] != otherOwners[j],
                    "Can't create an account with duplicate owners entry."
                );
            }
        }

        _;
    }

    function createAccount(
        address[] memory otherOwners
    ) external canCreateAccount(otherOwners) {
        address[] memory owners = new address[](otherOwners.length + 1);
        owners[0] = msg.sender;
        userAccountsCounter[msg.sender] += 1;
        for (uint idx; idx < otherOwners.length; idx++) {
            require(
                userAccountsCounter[otherOwners[idx]] < 3,
                "One of the account owners your trying to add already owns 3 accounts."
            );
            owners[idx + 1] = otherOwners[idx];
            userAccountsCounter[otherOwners[idx]] += 1;
        }
        currentAccountId++;
        accounts[currentAccountId].owners = owners;
    }

    function getUserAccountsCount() public view returns (uint) {
        return userAccountsCounter[msg.sender];
    }
}
