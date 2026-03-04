import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productFilter = 'active', period = 'week' } = req.query;
    const daysCount = period === 'all' ? 0 : (period === 'month' ? 30 : 7);

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Revenue calculation
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: { userProfileId: userProfile.id }
          }
        },
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] }
      },
      include: { items: { include: { product: { select: { userProfileId: true } } } } }
    });

    const revenue = orders.reduce((sum, order) => {
      const userItems = order.items.filter(item => item.product?.userProfileId === userProfile.id);
      return sum + userItems.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    }, 0);

    const platformFees = revenue * 0.15;
    const profits = revenue - platformFees;

    // Visitors
    const visitors = userProfile.profileViews || 0;

    // Paid customers
    let paidCustomersWeek = 0;
    let paidCustomersMonth = 0;
    let paidCustomersToday = 0;

    if (period !== 'all') {
      const weekAgo = subDays(new Date(), 7);
      const monthAgo = subDays(new Date(), 30);
      const todayStart = startOfDay(new Date());

      paidCustomersWeek = await prisma.order.count({
        where: {
          items: { some: { product: { userProfileId: userProfile.id } } },
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: weekAgo }
        }
      });

      paidCustomersMonth = await prisma.order.count({
        where: {
          items: { some: { product: { userProfileId: userProfile.id } } },
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: monthAgo }
        }
      });

      paidCustomersToday = await prisma.order.count({
        where: {
          items: { some: { product: { userProfileId: userProfile.id } } },
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: todayStart }
        }
      });
    }

    // Plans count
    const plansCount = await prisma.therapyPlan.groupBy({
      by: ['status'],
      where: { userProfileId: userProfile.id },
      _count: true
    });

    const participatedPlans = await prisma.therapyPlanParticipant.count({
      where: {
        userId,
        plan: { userProfileId: { not: userProfile.id } }
      }
    });

    const planStats = {
      draft: plansCount.find(p => p.status === 'DRAFT')?._count || 0,
      pending: plansCount.find(p => p.status === 'PENDING_REVIEW')?._count || 0,
      published: plansCount.find(p => p.status === 'PUBLISHED')?._count || 0,
      inProgress: plansCount.find(p => p.status === 'IN_PROGRESS')?._count || 0,
      finished: plansCount.find(p => p.status === 'FINISHED')?._count || 0,
      archived: plansCount.find(p => p.status === 'ARCHIVED')?._count || 0,
      initiated: plansCount.reduce((sum, p) => sum + p._count, 0),
      participated: participatedPlans,
      total: plansCount.reduce((sum, p) => sum + p._count, 0)
    };

    // Products count
    const allProducts = await prisma.product.findMany({
      where: { userProfileId: userProfile.id },
      select: { status: true, stock: true }
    });

    const productsCount = {
      active: allProducts.filter(p => p.status === 'PUBLISHED' && p.stock > 0).length,
      soldOut: allProducts.filter(p => p.stock === 0).length,
      draft: allProducts.filter(p => p.status === 'DRAFT').length,
      pending: allProducts.filter(p => p.status === 'PENDING_REVIEW').length,
      all: allProducts.length
    };

    // Total sold
    const totalSold = await prisma.orderItem.aggregate({
      where: { product: { userProfileId: userProfile.id } },
      _sum: { quantity: true }
    });

    // Products bought
    const productsBought = await prisma.orderItem.count({
      where: {
        order: {
          userId,
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] }
        },
        product: {
          userProfileId: { not: userProfile.id }
        }
      }
    });

    // Trends (last 7 or 30 days)
    const trends: any = { revenue: [], visitors: [], paidCustomers: [], orders: [] };

    if (period !== 'all') {
      for (let i = daysCount - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const dayOrders = await prisma.order.findMany({
          where: {
            items: { some: { product: { userProfileId: userProfile.id } } },
            status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
            createdAt: { gte: dayStart, lte: dayEnd }
          },
          include: { items: true }
        });

        const dayRevenue = dayOrders.reduce((sum, order) => {
          return sum + order.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
        }, 0);

        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        trends.revenue.push({ date: dateStr, value: dayRevenue });
        trends.visitors.push({ date: dateStr, value: 0 });
        trends.paidCustomers.push({ date: dateStr, value: dayOrders.length });
        trends.orders.push({ date: dateStr, value: dayOrders.length });
      }
    }

    res.json({
      revenue,
      platformFees,
      profits,
      visitors,
      paidCustomers: { week: paidCustomersWeek, today: paidCustomersToday, month: paidCustomersMonth },
      plansCount: planStats,
      productsCount,
      totalSold: totalSold._sum.quantity || 0,
      productsBought,
      trends
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
