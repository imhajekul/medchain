// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAuditLogger.sol";

/**
 * @title AuditLogger
 * @notice Provides an immutable, append-only audit trail for MedVault.
 * @dev Records access events, owner grants, and lifecycle events.
 */
contract AuditLogger is IAuditLogger {
    // --- Custom Errors ---
    error CallerNotAuthorized();
    error ZeroAddressNotAllowed();

    // --- State Variables ---
    address public owner;
    address public permissionsVault;
    address public relayer; // Authorized backend relayer for gasless audit logging

    // recordId => total times accessed
    mapping(bytes32 => uint256) private _accessCounts;
    // recordId => timestamp of last access
    mapping(bytes32 => uint64) public lastAccessTimestamp;

    // --- Modifiers ---
    modifier onlyOwner() {
        if (msg.sender != owner) revert CallerNotAuthorized();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != permissionsVault && msg.sender != relayer && msg.sender != owner) {
            revert CallerNotAuthorized();
        }
        _;
    }

    constructor(address _relayer) {
        if (_relayer == address(0)) revert ZeroAddressNotAllowed();
        owner = msg.sender;
        relayer = _relayer;
    }

    /**
     * @notice Sets the PermissionsVault contract address.
     */
    function setPermissionsVault(address _permissionsVault) external onlyOwner {
        if (_permissionsVault == address(0)) revert ZeroAddressNotAllowed();
        permissionsVault = _permissionsVault;
    }

    /**
     * @notice Updates the backend relayer address.
     */
    function setRelayer(address _relayer) external onlyOwner {
        if (_relayer == address(0)) revert ZeroAddressNotAllowed();
        relayer = _relayer;
    }

    /**
     * @notice Logs a MedVault lifecycle or access event.
     * @dev Emits AuditLogged event and increments counters for RECORD_ACCESSED.
     */
    function logEvent(
        bytes32 recordId,
        address actor,
        ActionType action,
        string calldata context
    ) external override onlyAuthorized {
        if (action == ActionType.RECORD_ACCESSED) {
            _accessCounts[recordId] += 1;
            lastAccessTimestamp[recordId] = uint64(block.timestamp);
        }

        emit AuditLogged(
            recordId,
            actor,
            action,
            uint64(block.timestamp),
            context
        );
    }

    /**
     * @notice Returns total number of times a record was accessed.
     */
    function getAccessCount(bytes32 recordId) external view override returns (uint256) {
        return _accessCounts[recordId];
    }
}
