import getPrismaClient from './db';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  const prisma = getPrismaClient();

  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch (e: any) {
    console.warn('Seed database user check encountered issue:', e?.message || e);
    return;
  }

  if (userCount === 0) {
    console.log('Seeding initial users...');
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const salesHash = await bcrypt.hash('Sales@123', 10);

    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@example.com',
        passwordHash: adminHash,
        role: 'Admin',
        isActive: true,
        phone: '9876543210'
      }
    });

    const salesWorker = await prisma.user.create({
      data: {
        name: 'Sales Worker',
        email: 'sales@example.com',
        passwordHash: salesHash,
        role: 'SalesWorker',
        isActive: true,
        phone: '9876543211'
      }
    });

    console.log('Created initial users:', admin.email, salesWorker.email);
  }

  const catCount = await prisma.category.count();
  if (catCount === 0) {
    console.log('Seeding categories...');
    await prisma.category.createMany({
      data: [
        { name: 'Groceries', description: 'Daily groceries' },
        { name: 'Beverages', description: 'Drinks and beverages' },
        { name: 'Electronics', description: 'Electronic items' },
        { name: 'Stationery', description: 'Stationery items' }
      ]
    });
  }

  const prodCount = await prisma.product.count();
  if (prodCount === 0) {
    console.log('Seeding products & initial stock...');
    const cat = await prisma.category.findFirst();
    if (cat) {
      const p1 = await prisma.product.create({
        data: {
          sku: 'SKU001',
          barcode: '890100001',
          productName: 'Basmati Rice 1Kg',
          categoryId: cat.id,
          purchasePrice: 50,
          sellingPrice: 60,
          gstPercentage: 5,
          stockQuantity: 100,
          minimumStockLevel: 10,
          unit: 'Kg',
          description: 'Premium basmati rice'
        }
      });
      const p2 = await prisma.product.create({
        data: {
          sku: 'SKU002',
          barcode: '890100002',
          productName: 'Sugar 1Kg',
          categoryId: cat.id,
          purchasePrice: 40,
          sellingPrice: 45,
          gstPercentage: 5,
          stockQuantity: 50,
          minimumStockLevel: 20,
          unit: 'Kg'
        }
      });
      const p3 = await prisma.product.create({
        data: {
          sku: 'SKU003',
          barcode: '890100003',
          productName: 'Milk 1L',
          categoryId: cat.id,
          purchasePrice: 30,
          sellingPrice: 35,
          gstPercentage: 5,
          stockQuantity: 5,
          minimumStockLevel: 10,
          unit: 'Liter'
        }
      });
      const p4 = await prisma.product.create({
        data: {
          sku: 'SKU004',
          barcode: '890100004',
          productName: 'Notebook',
          categoryId: cat.id,
          purchasePrice: 20,
          sellingPrice: 30,
          gstPercentage: 12,
          stockQuantity: 0,
          minimumStockLevel: 5,
          unit: 'Piece'
        }
      });

      const products = [p1, p2, p3, p4];
      for (const p of products) {
        if (p.stockQuantity > 0) {
          await prisma.stockTransaction.create({
            data: {
              productId: p.id,
              transactionType: 'StockIn',
              quantity: p.stockQuantity,
              previousStock: 0,
              newStock: p.stockQuantity,
              reference: 'Initial Stock',
              remarks: 'Seed data'
            }
          });
        }
      }

      // Offers seed
      const now = new Date();
      const future = new Date();
      future.setDate(now.getDate() + 30);
      const past = new Date();
      past.setDate(now.getDate() - 5);

      await prisma.offer.create({
        data: {
          name: 'Festive 10% Off',
          description: '10% off on all products',
          offerType: 'PercentageDiscount',
          discountPercentage: 10,
          startDate: past,
          endDate: future,
          isActive: true
        }
      });

      await prisma.offer.create({
        data: {
          name: 'Rice Buy 5 Get 1',
          description: 'Buy 5 Kg Rice Get 1 Kg Free',
          productId: p1.id,
          offerType: 'BuyXGetY',
          buyQuantity: 5,
          freeQuantity: 1,
          startDate: past,
          endDate: future,
          isActive: true
        }
      });
    }
  }

  console.log('Database seeding complete.');
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('Failed to seed database:', err);
    process.exit(1);
  });
}
