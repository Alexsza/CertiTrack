// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "https://github.com/0xcert/ethereum-erc721/src/contracts/tokens/nf-token-metadata.sol";
import "https://github.com/0xcert/ethereum-erc721/src/contracts/ownership/ownable.sol";

contract Project1 is NFTokenMetadata, Ownable {
    event MintEvent(address indexed _to, uint256 indexed _tokenId, string _uri, uint256 _mintTimestamp);
    event TransferEvent(address indexed _from, address indexed _to, uint256 indexed _tokenId, uint256 _transferTimestamp);

    mapping(uint256 => address) private tokenOwners;
    mapping(uint256 => uint256) private tokenTransferTimestamps;

    constructor() {
        nftName = "CertiTrack";
        nftSymbol = "CT";
    }

    function mint(
        address _to,
        uint256 _tokenId,
        string calldata _uri,
        uint256 _transferTimestamp
    ) external {
        super._mint(_to, _tokenId);
        super._setTokenUri(_tokenId, _uri);
        tokenOwners[_tokenId] = _to;
        tokenTransferTimestamps[_tokenId] = _transferTimestamp;

        emit MintEvent(_to, _tokenId, _uri, block.timestamp);
    }

    function transfer(address _to, uint256 _tokenId) external {
        address from = tokenOwners[_tokenId];

        require(from != address(0), "Token does not exist");
        require(from == msg.sender, "Transfer not authorized");

        tokenOwners[_tokenId] = _to;
        tokenTransferTimestamps[_tokenId] = block.timestamp; 

        emit TransferEvent(from, _to, _tokenId, block.timestamp);
    }

    function getTokenTransferTimestamp(uint256 _tokenId) external view returns (uint256) {
        return tokenTransferTimestamps[_tokenId];
    }
}
