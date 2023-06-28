// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "https://github.com/0xcert/ethereum-erc721/src/contracts/tokens/nf-token-metadata.sol";
import "https://github.com/0xcert/ethereum-erc721/src/contracts/ownership/ownable.sol";

contract Project1 is NFTokenMetadata, Ownable {
    event MintEvent(address indexed _to, uint256 indexed _tokenId, string _uri, uint256 _timestamp);

    mapping(uint256 => address) private tokenRecipients;
    mapping(address => uint256) private recipientTokens;
    uint256 private tokenCount;

    constructor() {
        nftName = "CertiTrack";
        nftSymbol = "CT";
        tokenCount = 0;
    }

    function mint(
        address _to,
        uint256 _tokenId,
        string calldata _uri
    ) external onlyOwner {
        super._mint(_to, _tokenId);
        super._setTokenUri(_tokenId, _uri);
        tokenRecipients[_tokenId] = _to;
        recipientTokens[_to] = _tokenId;
        tokenCount++;

        // Add the minting timestamp to the token's metadata
        emit MintEvent(_to, _tokenId, _uri, block.timestamp);
    }

    function burn(uint256 _tokenId) external onlyOwner {
        super._burn(_tokenId);
        address recipient = tokenRecipients[_tokenId];
        delete tokenRecipients[_tokenId];
        delete recipientTokens[recipient];
        tokenCount--;
    }

    function totalSupply() external view returns (uint256) {
        return tokenCount;
    }

    function getTokenRecipient(uint256 _tokenId) external view returns (address) {
        return tokenRecipients[_tokenId];
    }

    function getTokenByRecipient(address _recipient) external view returns (uint256) {
        return recipientTokens[_recipient];
    }
}
