// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAuditLogger.sol";

/**
 * @title PermissionsVault
 * @notice Manages encrypted record registrations and time-boxed doctor access grants.
 * @dev Autonomous expiry logic: grants expire naturally when block.timestamp > validTo.
 */
contract PermissionsVault {
    // --- Custom Errors ---
    error RecordAlreadyExists();
    error RecordNotFound();
    error NotRecordOwner();
    error InvalidDoctorAddress();
    error InvalidTimeWindow();
    error GrantNotFound();
    error GrantAlreadyRevoked();
    error UnauthorizedAccessor();

    // --- Structs (Storage-packed for gas efficiency) ---
    struct Record {
        address owner;          // 20 bytes ┐ Slot 1 (32 bytes total)
        uint64 createdAt;       // 8 bytes  │
        bool exists;            // 1 byte   ┘
        bytes32 contentHash;    // 32 bytes   Slot 2 (SHA-256 of encrypted blob)
        string ipfsCid;         // Dynamic    Slot 3+ (IPFS CID)
    }

    struct Grant {
        uint64 validFrom;       // 8 bytes ┐ Slot 1 (25 bytes total)
        uint64 validTo;         // 8 bytes │
        bool isRevoked;         // 1 byte  │
        bool exists;            // 1 byte  ┘
        bytes32 grantId;        // 32 bytes  Slot 2
    }

    // --- State Variables ---
    address public immutable owner;
    IAuditLogger public immutable auditLogger;

    // recordId => Record
    mapping(bytes32 => Record) public records;

    // keccak256(abi.encodePacked(recordId, doctorAddress)) => Grant
    mapping(bytes32 => Grant) public grants;

    // --- Modifiers ---
    modifier onlyRecordOwner(bytes32 recordId) {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        if (rec.owner != msg.sender) revert NotRecordOwner();
        _;
    }

    constructor(address _auditLoggerAddress) {
        require(_auditLoggerAddress != address(0), "Invalid audit logger");
        owner = msg.sender;
        auditLogger = IAuditLogger(_auditLoggerAddress);
    }

    // --- Helper Functions ---
    /**
     * @notice Deterministic key for the (recordId, doctor) grant lookup.
     */
    function getGrantKey(bytes32 recordId, address doctor) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(recordId, doctor));
    }

    // --- Core Functions ---

    /**
     * @notice Register a newly uploaded encrypted health record pointer.
     * @param recordId Unique identifier for the medical record (e.g. keccak256 UUID).
     * @param ipfsCid The IPFS CID containing the AES-256 encrypted payload.
     * @param contentHash SHA-256 integrity hash of the raw ciphertext.
     */
    function registerRecord(
        bytes32 recordId,
        string calldata ipfsCid,
        bytes32 contentHash
    ) external {
        if (records[recordId].exists) revert RecordAlreadyExists();
        require(bytes(ipfsCid).length > 0, "Empty CID");

        records[recordId] = Record({
            owner: msg.sender,
            createdAt: uint64(block.timestamp),
            exists: true,
            contentHash: contentHash,
            ipfsCid: ipfsCid
        });

        // Trigger on-chain audit log
        auditLogger.logEvent(
            recordId,
            msg.sender,
            IAuditLogger.ActionType.RECORD_REGISTERED,
            ipfsCid
        );
    }

    /**
     * @notice Grant time-boxed access to a doctor.
     * @param recordId The record identifier.
     * @param doctor The doctor's Ethereum wallet address.
     * @param validFrom Unix timestamp when access begins.
     * @param validTo Unix timestamp when access automatically lapses.
     */
    function grantAccess(
        bytes32 recordId,
        address doctor,
        uint64 validFrom,
        uint64 validTo
    ) external onlyRecordOwner(recordId) {
        if (doctor == address(0)) revert InvalidDoctorAddress();
        if (validTo <= validFrom) revert InvalidTimeWindow();
        if (validTo <= block.timestamp) revert InvalidTimeWindow();

        bytes32 grantKey = getGrantKey(recordId, doctor);
        bytes32 grantId = keccak256(abi.encodePacked(recordId, doctor, validFrom, block.timestamp));

        grants[grantKey] = Grant({
            validFrom: validFrom,
            validTo: validTo,
            isRevoked: false,
            exists: true,
            grantId: grantId
        });

        auditLogger.logEvent(
            recordId,
            msg.sender,
            IAuditLogger.ActionType.ACCESS_GRANTED,
            string(abi.encodePacked("Doctor:", _toHexString(doctor)))
        );
    }

    /**
     * @notice Early manual revocation of access before validTo expiration.
     */
    function revokeAccess(bytes32 recordId, address doctor) external onlyRecordOwner(recordId) {
        bytes32 grantKey = getGrantKey(recordId, doctor);
        Grant storage grant = grants[grantKey];
        if (!grant.exists) revert GrantNotFound();
        if (grant.isRevoked) revert GrantAlreadyRevoked();

        grant.isRevoked = true;

        auditLogger.logEvent(
            recordId,
            msg.sender,
            IAuditLogger.ActionType.ACCESS_REVOKED,
            string(abi.encodePacked("Doctor:", _toHexString(doctor)))
        );
    }

    /**
     * @notice Authoritative query to check if a doctor currently holds valid, unexpired access.
     * @dev Zero-gas autonomous check.
     */
    function isAccessValid(bytes32 recordId, address doctor) external view returns (bool) {
        // Record owner always has access to their own record
        if (records[recordId].exists && records[recordId].owner == doctor) {
            return true;
        }

        bytes32 grantKey = getGrantKey(recordId, doctor);
        Grant memory grant = grants[grantKey];

        if (!grant.exists) return false;
        if (grant.isRevoked) return false;
        if (block.timestamp < grant.validFrom) return false;
        if (block.timestamp > grant.validTo) return false; // Natural time-boxed expiry

        return true;
    }

    /**
     * @notice Record an access event when a doctor views/downloads a record.
     * @dev Can be called directly by the authorized doctor.
     */
    function logRecordAccess(bytes32 recordId, string calldata context) external {
        if (!this.isAccessValid(recordId, msg.sender)) {
            revert UnauthorizedAccessor();
        }

        auditLogger.logEvent(
            recordId,
            msg.sender,
            IAuditLogger.ActionType.RECORD_ACCESSED,
            context
        );
    }

    // --- Internal Helpers ---
    function _toHexString(address account) internal pure returns (string memory) {
        bytes memory data = abi.encodePacked(account);
        bytes memory str = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        bytes memory alphabet = "0123456789abcdef";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
