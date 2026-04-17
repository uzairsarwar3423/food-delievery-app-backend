FoodHunger Deals & Campaigns - 4-Day Implementation Plan📅 Day 1: Backend Foundation & Database SetupDatabase Schema Creation
Files to Create:

backend/prisma/migrations/[timestamp]_create_deals_tables.sql
backend/prisma/schema.prisma (update)
Tables to Build:

deals table - Main deals storage

Basic info (title, description, subtitle)
Visual (image_url, gradient colors)
Deal type & discount logic
Applicability rules
Validity dates
Terms & conditions
Usage limits



deal_usage table - Track deal usage

User-deal relationship
Order association
Discount tracking
Timestamps



Update orders table

Add deal_id foreign key
Add deal_discount field
Add deal_name field


Logic to Implement:

Database indexes for performance
Foreign key constraints
Default values setup
Validation constraints
📅 Day 2: Backend APIs & Business LogicAPI Endpoints Development
Files to Create:

backend/src/routes/v1/deals.routes.js
backend/src/controllers/deals.controller.js
backend/src/services/deals.service.js
backend/src/validators/deals.validator.js
backend/src/utils/dealCalculator.js
APIs to Build:1. GET /api/v1/deals - Get All Deals

Query parameters: page, limit, featured, restaurantId, sortBy
Pagination logic
Filtering by restaurant/category
Sort by newest, ending_soon, popular
2. GET /api/v1/deals/featured - Featured Deals for Home

Limit to 10 deals
Sort by display_order
Only active & featured deals
Optimized response (minimal data)
3. GET /api/v1/deals/:id - Single Deal Detail

Full deal information
Restaurant details included
User usage status
Terms & conditions formatted
Campaign info
4. POST /api/v1/deals/:id/apply - Apply Deal to Cart

Validate deal eligibility
Calculate discount
Check usage limits
Return discount breakdown
5. GET /api/v1/deals/restaurant/:restaurantId - Restaurant Deals

All active deals for restaurant
Sorted by validity
Check user eligibility for each
6. GET /api/v1/deals/my-usage - User Deal History

User's past deal usage
Total savings calculation
Deal history with order details
7. POST /api/v1/deals/:id/favorite - Add to Favorites

Add deal to user favorites
Validation checks
8. DELETE /api/v1/deals/:id/favorite - Remove Favorite

Remove from favorites
Return success status
Business Logic Functions:validateDealApplication(dealId, cartData, userId)

Check deal exists & active
Validate date range
Check user usage limit
Verify minimum order value
Check restaurant match
Verify total usage limit
Return validation result
calculateDiscount(deal, cartSubtotal)

Handle percentage discount
Handle fixed amount discount
Handle bundle deals
Handle free item deals
Apply max discount cap
Return discount amount
checkDealEligibility(dealId, userId)

Can user use this deal?
How many times used?
Usage remaining
Return eligibility status
Files to Update:

backend/src/controllers/order.controller.js - Include deal in order creation
backend/src/services/order.service.js - Create deal_usage entry on order success
Testing:

Test all endpoints with Postman
Validate business logic
Edge case testing (expired deals, usage limits, invalid carts)
