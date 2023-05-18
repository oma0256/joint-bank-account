pragma solidity ^0.8.9;

/*
1. User will be able to create an account and add other users as joint owners.
2. Only owners of the account will be able to deposit money to the account.
3. Only owners of the account will be able to withdraw money from it. A withdraw
   request will need to be made first and then approved by the account owners
   before money can be withdrawn from the account.
*/

contract BankAccount {
    event Deposit(
        address indexed user,
        uint256 indexed accountId,
        uint256 value,
        uint256 timestamp
    );

    event WithdrawlRequest(
        address indexed user,
        uint256 indexed accountId,
        uint256 withdrawRequestId,
        uint256 amount,
        uint256 timestamp
    );

    event RequestApproval(
        address indexed user,
        uint256 indexed accountId,
        uint256 withdrawRequestId,
        bool isApproved,
        uint256 timestamp
    );

    event Withdraw(
        address indexed user,
        uint256 indexed accountId,
        uint256 withdrawRequestId,
        uint256 amount,
        uint256 timestamp
    );

    struct WithdrawRequest {
        address user;
        uint amount;
        bool isApproved;
        mapping(address => bool) approvers;
        uint approvalsCount;
    }

    struct Account {
        address[] owners;
        uint balance;
        mapping(uint => WithdrawRequest) withdrawRequests;
    }

    mapping(uint => Account) accounts;
    mapping(address => uint) userAccountsCounter;
    uint currentAccountId;
    uint currentWithdrawRequestId;

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

    modifier isAccountOwner(uint accountId) {
        bool _isAccountOwner;
        for (uint idx; idx < accounts[accountId].owners.length; idx++) {
            if (accounts[accountId].owners[idx] == msg.sender) {
                _isAccountOwner = true;
            }
        }
        require(
            _isAccountOwner,
            "Only account owners can make a deposit to this account"
        );
        _;
    }

    modifier hasSufficientBalance(uint accountId, uint amount) {
        require(accounts[accountId].balance >= amount, "Insufficient balance.");
        _;
    }

    modifier isWithdrwalrequestOwner(uint accountId, uint withdrawalRequestId) {
        require(
            accounts[accountId].withdrawRequests[withdrawalRequestId].user ==
                msg.sender,
            "You didn't initiate this withdrawal request."
        );
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

    function deposit(
        uint accountId
    ) external payable isAccountOwner(accountId) {
        accounts[accountId].balance += msg.value;
        emit Deposit(msg.sender, accountId, msg.value, block.timestamp);
    }

    function requestWithdrawl(
        uint accountId,
        uint amount
    )
        external
        isAccountOwner(accountId)
        hasSufficientBalance(accountId, amount)
    {
        currentWithdrawRequestId++;
        WithdrawRequest storage withdrawRequest = accounts[accountId]
            .withdrawRequests[currentWithdrawRequestId];
        withdrawRequest.amount = amount;
        withdrawRequest.user = msg.sender;
        emit WithdrawlRequest(
            msg.sender,
            accountId,
            currentWithdrawRequestId,
            amount,
            block.timestamp
        );
    }

    function approveWithdrawal(
        uint accountId,
        uint withdrawalRequestId
    ) external isAccountOwner(accountId) {
        WithdrawRequest storage withdrawRequest = accounts[accountId]
            .withdrawRequests[withdrawalRequestId];
        require(
            withdrawRequest.user != msg.sender,
            "You can't approve your own withdraw request."
        );
        require(
            !withdrawRequest.approvers[msg.sender],
            "You already approved this withdraw request."
        );
        withdrawRequest.approvers[msg.sender] = true;
        withdrawRequest.approvalsCount += 1;
        if (
            withdrawRequest.approvalsCount ==
            accounts[accountId].owners.length - 1
        ) {
            withdrawRequest.isApproved = true;
        }
        emit RequestApproval(
            msg.sender,
            accountId,
            withdrawalRequestId,
            withdrawRequest.isApproved,
            block.timestamp
        );
    }

    function withdraw(
        uint accountId,
        uint withdrawalRequestId
    )
        external
        isAccountOwner(accountId)
        isWithdrwalrequestOwner(accountId, withdrawalRequestId)
    {
        uint amount = accounts[accountId]
            .withdrawRequests[withdrawalRequestId]
            .amount;
        accounts[accountId].balance -= amount;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent);
        emit Withdraw(
            msg.sender,
            accountId,
            withdrawalRequestId,
            amount,
            block.timestamp
        );
    }

    function getUserAccountsCount() public view returns (uint) {
        return userAccountsCounter[msg.sender];
    }

    function getAccountBalance(uint accountId) public view returns (uint) {
        return accounts[accountId].balance;
    }
}
