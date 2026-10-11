// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MedVaultAccess
 * @notice Principal EVM Smart Contract for MedVault Access Control & On-Chain Audit Trail.
 * @dev Enforces Zero-Exposure philosophy: only CIDs, cryptographic identifiers, and time-boxes are stored.
 */
contract MedVaultAccess {
    // =========================================================================
    // ENUMS & STRUCTS
    // =========================================================================

    enum GrantStatus {
        Active,
        Revoked
    }

    struct Record {
        string storageCID;       // IPFS/Arweave content hash pointer
        address ownerWallet;     // Patient wallet address
        uint256 createdAt;       // Unix timestamp of registration
        bool exists;
    }

    struct Grant {
        bytes32 grantId;         // keccak256(recordId, granteeWallet, block.timestamp)
        bytes32 recordId;        // Reference to parent medical record
        address granteeWallet;   // Healthcare provider / Doctor wallet
        uint256 expiresAt;       // Unix timestamp after which access auto-expires
        GrantStatus status;      // Active or Revoked
        bool exists;
    }

    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    address public owner;
    address public relayer; // Authorized backend relayer for gasless audit logging

    // recordId => Record
    mapping(bytes32 => Record) public records;

    // grantId => Grant
    mapping(bytes32 => Grant) public grants;

    // mapping of (recordId => (grantee => grantId)) for fast lookup
    mapping(bytes32 => mapping(address => bytes32)) public activeGrantLookup;

    // =========================================================================
    // EVENTS
    // =========================================================================

    event RecordRegistered(
        bytes32 indexed recordId,
        address indexed owner,
        string cid
    );

    event GrantCreated(
        bytes32 indexed grantId,
        bytes32 indexed recordId,
        address indexed grantee,
        uint256 expiresAt
    );

    event RecordAccessed(
        bytes32 indexed grantId,
        address indexed actor,
        uint256 timestamp
    );

    event GrantRevoked(
        bytes32 indexed grantId,
        uint256 timestamp
    );

    event RelayerUpdated(
        address indexed oldRelayer,
        address indexed newRelayer
    );

    // =========================================================================
    // CUSTOM ERRORS
    // =========================================================================

    error OnlyOwnerAllowed();
    error OnlyRecordOwnerAllowed();
    error OnlyGrantOwnerAllowed();
    error OnlyAuthorizedAccessorOrRelayer();
    error RecordAlreadyExists();
    error RecordNotFound();
    error GrantNotFound();
    error GrantAlreadyRevoked();
    error GrantExpired();
    error InvalidGranteeAddress();
    error InvalidDuration();
    error EmptyStorageCID();
    error ZeroAddressNotAllowed();

    // =========================================================================
    // MODIFIERS
    // =========================================================================

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwnerAllowed();
        _;
    }

    modifier onlyRecordOwner(bytes32 recordId) {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        if (rec.ownerWallet != msg.sender) revert OnlyRecordOwnerAllowed();
        _;
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    constructor(address _relayer) {
        if (_relayer == address(0)) revert ZeroAddressNotAllowed();
        owner = msg.sender;
        relayer = _relayer;
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    /**
     * @notice Updates the trusted backend relayer address.
     */
    function setRelayer(address _newRelayer) external onlyOwner {
        if (_newRelayer == address(0)) revert ZeroAddressNotAllowed();
        emit RelayerUpdated(relayer, _newRelayer);
        relayer = _newRelayer;
    }

    // =========================================================================
    // STEP 1 FUNCTIONS: RECORDS & GRANTS
    // =========================================================================

    /**
     * @notice Registers a client-side encrypted health record on-chain.
     * @param recordId Unique cryptographic identifier (keccak256 hash or UUID).
     * @param cid IPFS CID pointing to the client-side AES-256 encrypted blob.
     */
    function registerRecord(bytes32 recordId, string calldata cid) external {
        if (records[recordId].exists) revert RecordAlreadyExists();
        if (bytes(cid).length == 0) revert EmptyStorageCID();

        records[recordId] = Record({
            storageCID: cid,
            ownerWallet: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });

        emit RecordRegistered(recordId, msg.sender, cid);
    }

    /**
     * @notice Creates a time-boxed access grant from a patient to a doctor.
     * @param recordId Target medical record.
     * @param grantee Healthcare provider's Ethereum wallet address.
     * @param durationInSeconds Active duration in seconds before auto-expiration.
     */
    function createGrant(
        bytes32 recordId,
        address grantee,
        uint256 durationInSeconds
    ) external onlyRecordOwner(recordId) returns (bytes32 grantId) {
        if (grantee == address(0)) revert InvalidGranteeAddress();
        if (durationInSeconds == 0) revert InvalidDuration();

        uint256 expiresAt = block.timestamp + durationInSeconds;

        // Generate deterministic unique grant ID
        grantId = keccak256(
            abi.encodePacked(recordId, grantee, block.timestamp, block.prevrandao)
        );

        grants[grantId] = Grant({
            grantId: grantId,
            recordId: recordId,
            granteeWallet: grantee,
            expiresAt: expiresAt,
            status: GrantStatus.Active,
            exists: true
        });

        activeGrantLookup[recordId][grantee] = grantId;

        emit GrantCreated(grantId, recordId, grantee, expiresAt);
        return grantId;
    }

    /**
     * @notice Early manual revocation of an active grant by the record owner.
     * @param grantId Unique identifier of the grant to revoke.
     */
    function revokeGrant(bytes32 grantId) external {
        Grant storage grant = grants[grantId];
        if (!grant.exists) revert GrantNotFound();

        Record storage record = records[grant.recordId];
        if (record.ownerWallet != msg.sender) revert OnlyGrantOwnerAllowed();
        if (grant.status == GrantStatus.Revoked) revert GrantAlreadyRevoked();

        grant.status = GrantStatus.Revoked;
        delete activeGrantLookup[grant.recordId][grant.granteeWallet];

        emit GrantRevoked(grantId, block.timestamp);
    }

    /**
     * @notice Immutably logs an access event on-chain.
     * @dev Callable by the doctor/grantee directly, or by the authorized backend relayer.
     * @param grantId The grant associated with this access request.
     */
    function logAccessEvent(bytes32 grantId) external {
        Grant memory grant = grants[grantId];
        if (!grant.exists) revert GrantNotFound();
        if (grant.status == GrantStatus.Revoked) revert GrantAlreadyRevoked();
        if (block.timestamp > grant.expiresAt) revert GrantExpired();

        // Enforce caller authenticity: Must be the grantee or authorized relayer
        if (msg.sender != grant.granteeWallet && msg.sender != relayer) {
            revert OnlyAuthorizedAccessorOrRelayer();
        }

        emit RecordAccessed(grantId, msg.sender, block.timestamp);
    }

    // =========================================================================
    // VIEW HELPERS
    // =========================================================================

    /**
     * @notice Checks if a grant is active and within its valid time window.
     */
    function isGrantActive(bytes32 grantId) external view returns (bool) {
        Grant memory grant = grants[grantId];
        if (!grant.exists) return false;
        if (grant.status == GrantStatus.Revoked) return false;
        if (block.timestamp > grant.expiresAt) return false; // Autonomous expiry
        return true;
    }

    /**
     * @notice Look up active grant for a specific record and doctor.
     */
    function getGrantForDoctor(bytes32 recordId, address doctor) external view returns (bytes32 grantId, bool active) {
        grantId = activeGrantLookup[recordId][doctor];
        if (grantId == bytes32(0)) return (bytes32(0), false);
        return (grantId, this.isGrantActive(grantId));
    }
}
