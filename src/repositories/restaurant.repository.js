/**
 * src/repositories/restaurant.repository.js
 * Restaurant Data Access Layer
 */

const { prisma } = require('../config/database');

class RestaurantRepository {
  /**
     * Find all restaurants with filters
     */
  async findMany({
    skip = 0,
    take = 20,
    where = {},
    orderBy = { createdAt: 'desc' },
    include = {},
  }) {
    // If select is provided in include (legacy or convenience), extract it
    const select = include.select;
    const finalInclude = { ...include };
    delete finalInclude.select;

    const queryOptions = {
      where,
      skip,
      take,
      orderBy,
    };

    if (select) {
      queryOptions.select = select;
    } else {
      queryOptions.include = {
        _count: {
          select: { reviews: true },
        },
        ...finalInclude,
      };
    }

    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany(queryOptions),
      prisma.restaurant.count({ where }),
    ]);

    return { restaurants, total };
  }

  /**
     * Find restaurant by ID
     */
  async findById(id, include = {}) {
    return prisma.restaurant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { reviews: true },
        },
        ...include,
      },
    });
  }

  /**
     * Find restaurant by slug
     */
  async findBySlug(slug) {
    return prisma.restaurant.findUnique({
      where: { slug },
    });
  }

  /**
     * Create restaurant
     */
  async create(data) {
    return prisma.restaurant.create({
      data,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
     * Update restaurant
     */
  async update(id, data) {
    return prisma.restaurant.update({
      where: { id },
      data,
    });
  }

  /**
     * Delete restaurant (soft delete by status or inactive)
     */
  async delete(id) {
    // Requirements say "set isActive = false" or hard delete.
    // Schema doesn't have isActive, but has status.
    // We can use status CLOSED or just hard delete if allowed.
    // I'll set status to CLOSED for soft delete.
    return prisma.restaurant.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  /**
     * Find nearby restaurants using raw SQL for distance if needed,
     * or just fetch and calculate in service.
     * Requirement says "Use calculate_distance PostgreSQL function".
     */
  async findNearbyRaw(lat, lng, radiusKm) {
    // This assumes the calculate_distance function exists in the DB.
    // If not, we might need a migration to add it.
    return prisma.$queryRaw`
      SELECT r.*, 
             calculate_distance(${lat}, ${lng}, CAST(r.latitude AS FLOAT), CAST(r.longitude AS FLOAT)) as distance
      FROM restaurants r
      WHERE r.status = 'APPROVED' 
        AND calculate_distance(${lat}, ${lng}, CAST(r.latitude AS FLOAT), CAST(r.longitude AS FLOAT)) <= ${radiusKm}
      ORDER BY distance ASC
    `;
  }

  /**
     * Check if restaurant has active orders
     */
  async hasActiveOrders(restaurantId) {
    const activeOrder = await prisma.order.findFirst({
      where: {
        restaurantId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'],
        },
      },
    });
    return !!activeOrder;
  }

  /**
   * Find by status
   */
  async findManyByStatus(status) {
    return prisma.restaurant.findMany({
      where: { status },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }
}

module.exports = new RestaurantRepository();
