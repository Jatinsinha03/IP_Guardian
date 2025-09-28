// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract IPRightsStore is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _itemIds;
    Counters.Counter private _rentalIds;
    
    // Struct to store IP item details
    struct IPItem {
        uint256 itemId;
        string title;
        string description;
        string blobId;           // Walrus blob ID
        address owner;
        uint256 price;           // Price in wei
        uint256 rentalPrice;     // Rental price per day in wei
        bool isActive;
        uint256 createdAt;
        uint256 totalRentals;
        uint256 totalRevenue;
    }
    
    // Struct to store rental information
    struct Rental {
        uint256 rentalId;
        uint256 itemId;
        address renter;
        uint256 startTime;
        uint256 endTime;
        uint256 amountPaid;
        bool isActive;
    }
    
    // Struct to store ownership history
    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
        uint256 price;
    }
    
    // Mappings
    mapping(uint256 => IPItem) public items;
    mapping(uint256 => Rental) public rentals;
    mapping(uint256 => OwnershipRecord[]) public ownershipHistory;
    mapping(address => uint256[]) public userItems;
    mapping(address => uint256[]) public userRentals;
    mapping(uint256 => mapping(address => bool)) public hasRented;
    mapping(uint256 => address[]) public itemRenters;
    
    // Events
    event ItemCreated(
        uint256 indexed itemId,
        string title,
        string blobId,
        address indexed owner,
        uint256 price,
        uint256 rentalPrice
    );
    
    event ItemPurchased(
        uint256 indexed itemId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 price
    );
    
    event ItemRented(
        uint256 indexed rentalId,
        uint256 indexed itemId,
        address indexed renter,
        uint256 startTime,
        uint256 endTime,
        uint256 amountPaid
    );
    
    event ItemUpdated(
        uint256 indexed itemId,
        uint256 newPrice,
        uint256 newRentalPrice
    );
    
    event ItemDeactivated(uint256 indexed itemId);
    
    // Modifiers
    modifier itemExists(uint256 _itemId) {
        require(_itemId <= _itemIds.current(), "Item does not exist");
        require(items[_itemId].isActive, "Item is not active");
        _;
    }
    
    modifier onlyItemOwner(uint256 _itemId) {
        require(items[_itemId].owner == msg.sender, "Not the item owner");
        _;
    }
    
    modifier validRentalPeriod(uint256 _startTime, uint256 _endTime) {
        require(_startTime >= block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_endTime <= block.timestamp + 365 days, "Rental period too long");
        _;
    }
    
    // Constructor
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new IP item
     * @param _title Title of the item
     * @param _description Description of the item
     * @param _blobId Walrus blob ID
     * @param _price Purchase price in wei
     * @param _rentalPrice Rental price per day in wei
     */
    function createItem(
        string memory _title,
        string memory _description,
        string memory _blobId,
        uint256 _price,
        uint256 _rentalPrice
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_blobId).length > 0, "Blob ID cannot be empty");
        require(_price > 0 || _rentalPrice > 0, "Must set either purchase or rental price");
        
        _itemIds.increment();
        uint256 newItemId = _itemIds.current();
        
        items[newItemId] = IPItem({
            itemId: newItemId,
            title: _title,
            description: _description,
            blobId: _blobId,
            owner: msg.sender,
            price: _price,
            rentalPrice: _rentalPrice,
            isActive: true,
            createdAt: block.timestamp,
            totalRentals: 0,
            totalRevenue: 0
        });
        
        userItems[msg.sender].push(newItemId);
        
        // Add initial ownership record
        ownershipHistory[newItemId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            price: 0
        }));
        
        emit ItemCreated(newItemId, _title, _blobId, msg.sender, _price, _rentalPrice);
        
        return newItemId;
    }
    
    /**
     * @dev Purchase an IP item (transfer ownership)
     * @param _itemId ID of the item to purchase
     */
    function purchaseItem(uint256 _itemId) 
        external 
        payable 
        nonReentrant 
        itemExists(_itemId) 
    {
        IPItem storage item = items[_itemId];
        require(item.price > 0, "Item is not for sale");
        require(msg.value >= item.price, "Insufficient payment");
        require(item.owner != msg.sender, "Cannot purchase your own item");
        
        address previousOwner = item.owner;
        
        // Transfer ownership
        item.owner = msg.sender;
        
        // Update user items
        userItems[msg.sender].push(_itemId);
        
        // Add ownership record
        ownershipHistory[_itemId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            price: item.price
        }));
        
        // Transfer payment to previous owner
        if (previousOwner != address(0)) {
            payable(previousOwner).transfer(item.price);
        }
        
        // Refund excess payment
        if (msg.value > item.price) {
            payable(msg.sender).transfer(msg.value - item.price);
        }
        
        emit ItemPurchased(_itemId, previousOwner, msg.sender, item.price);
    }
    
    /**
     * @dev Rent an IP item
     * @param _itemId ID of the item to rent
     * @param _startTime Start time of rental
     * @param _endTime End time of rental
     */
    function rentItem(
        uint256 _itemId,
        uint256 _startTime,
        uint256 _endTime
    ) 
        external 
        payable 
        nonReentrant 
        itemExists(_itemId) 
        validRentalPeriod(_startTime, _endTime) 
    {
        IPItem storage item = items[_itemId];
        require(item.rentalPrice > 0, "Item is not available for rent");
        require(item.owner != msg.sender, "Cannot rent your own item");
        
        uint256 rentalDuration = _endTime - _startTime;
        uint256 totalCost = (rentalDuration * item.rentalPrice) / 1 days;
        
        require(msg.value >= totalCost, "Insufficient payment for rental");
        
        _rentalIds.increment();
        uint256 newRentalId = _rentalIds.current();
        
        rentals[newRentalId] = Rental({
            rentalId: newRentalId,
            itemId: _itemId,
            renter: msg.sender,
            startTime: _startTime,
            endTime: _endTime,
            amountPaid: totalCost,
            isActive: true
        });
        
        // Update item statistics
        item.totalRentals++;
        item.totalRevenue += totalCost;
        
        // Update user rentals
        userRentals[msg.sender].push(newRentalId);
        
        // Track renters
        if (!hasRented[_itemId][msg.sender]) {
            hasRented[_itemId][msg.sender] = true;
            itemRenters[_itemId].push(msg.sender);
        }
        
        // Transfer payment to owner
        payable(item.owner).transfer(totalCost);
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit ItemRented(newRentalId, _itemId, msg.sender, _startTime, _endTime, totalCost);
    }
    
    /**
     * @dev Update item prices (only owner)
     * @param _itemId ID of the item
     * @param _newPrice New purchase price
     * @param _newRentalPrice New rental price per day
     */
    function updateItemPrices(
        uint256 _itemId,
        uint256 _newPrice,
        uint256 _newRentalPrice
    ) external onlyItemOwner(_itemId) itemExists(_itemId) {
        IPItem storage item = items[_itemId];
        require(_newPrice > 0 || _newRentalPrice > 0, "Must set either purchase or rental price");
        
        item.price = _newPrice;
        item.rentalPrice = _newRentalPrice;
        
        emit ItemUpdated(_itemId, _newPrice, _newRentalPrice);
    }
    
    /**
     * @dev Deactivate an item (only owner)
     * @param _itemId ID of the item
     */
    function deactivateItem(uint256 _itemId) external onlyItemOwner(_itemId) itemExists(_itemId) {
        items[_itemId].isActive = false;
        emit ItemDeactivated(_itemId);
    }
    
    /**
     * @dev Get item details
     * @param _itemId ID of the item
     */
    function getItem(uint256 _itemId) external view returns (IPItem memory) {
        require(_itemId <= _itemIds.current(), "Item does not exist");
        return items[_itemId];
    }
    
    /**
     * @dev Get rental details
     * @param _rentalId ID of the rental
     */
    function getRental(uint256 _rentalId) external view returns (Rental memory) {
        require(_rentalId <= _rentalIds.current(), "Rental does not exist");
        return rentals[_rentalId];
    }
    
    /**
     * @dev Get ownership history for an item
     * @param _itemId ID of the item
     */
    function getOwnershipHistory(uint256 _itemId) external view returns (OwnershipRecord[] memory) {
        require(_itemId <= _itemIds.current(), "Item does not exist");
        return ownershipHistory[_itemId];
    }
    
    /**
     * @dev Get all renters for an item
     * @param _itemId ID of the item
     */
    function getItemRenters(uint256 _itemId) external view returns (address[] memory) {
        require(_itemId <= _itemIds.current(), "Item does not exist");
        return itemRenters[_itemId];
    }
    
    /**
     * @dev Get user's items
     * @param _user User address
     */
    function getUserItems(address _user) external view returns (uint256[] memory) {
        return userItems[_user];
    }
    
    /**
     * @dev Get user's rentals
     * @param _user User address
     */
    function getUserRentals(address _user) external view returns (uint256[] memory) {
        return userRentals[_user];
    }
    
    /**
     * @dev Check if user has active rental for an item
     * @param _itemId ID of the item
     * @param _user User address
     */
    function hasActiveRental(uint256 _itemId, address _user) external view returns (bool) {
        uint256[] memory userRentalIds = userRentals[_user];
        
        for (uint256 i = 0; i < userRentalIds.length; i++) {
            Rental memory rental = rentals[userRentalIds[i]];
            if (rental.itemId == _itemId && 
                rental.isActive && 
                block.timestamp >= rental.startTime && 
                block.timestamp <= rental.endTime) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Get total number of items
     */
    function getTotalItems() external view returns (uint256) {
        return _itemIds.current();
    }
    
    /**
     * @dev Get total number of rentals
     */
    function getTotalRentals() external view returns (uint256) {
        return _rentalIds.current();
    }
    
    /**
     * @dev Get all active items (paginated)
     * @param _offset Starting index
     * @param _limit Number of items to return
     */
    function getActiveItems(uint256 _offset, uint256 _limit) external view returns (IPItem[] memory) {
        uint256 totalItems = _itemIds.current();
        require(_offset < totalItems, "Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > totalItems) {
            end = totalItems;
        }
        
        IPItem[] memory activeItems = new IPItem[](end - _offset);
        uint256 count = 0;
        
        for (uint256 i = _offset + 1; i <= end; i++) {
            if (items[i].isActive) {
                activeItems[count] = items[i];
                count++;
            }
        }
        
        // Resize array to actual count
        IPItem[] memory result = new IPItem[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeItems[i];
        }
        
        return result;
    }
    
    /**
     * @dev Emergency function to withdraw contract balance (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner()).transfer(balance);
    }
}
