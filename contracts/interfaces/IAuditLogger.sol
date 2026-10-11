// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAuditLogger
 * @notice Interface for MedVault immutable access and lifecycle audit trail
 */
interface IAuditLogger {
    enum ActionType {
        RECORD_REGISTERED,
        ACCESS_GRANTED,
        ACCESS_REVOKED,
        RECORD_ACCESSED
    }

    event AuditLogged(
        bytes32 indexed recordId,
        address indexed actor,
        ActionType indexed action,
        uint64 timestamp,
        string context
    );

    function logEvent(
        bytes32 recordId,
        address actor,
        ActionType action,
        string calldata context
    ) external;

    function getAccessCount(bytes32 recordId) external view returns (uint256);
}
