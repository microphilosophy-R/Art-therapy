import { prisma } from './prisma';

const REQUIRED_PRODUCT_COLUMNS = ['defaultposterid', 'posterurl', 'videourl'] as const;

type ColumnRow = {
  column_name: string;
};

export const verifyProductMediaSchema = async (): Promise<void> => {
  const rows = await prisma.$queryRaw<ColumnRow[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND lower(table_name) = 'product'
  `;

  const existingColumns = new Set(rows.map((row) => row.column_name.toLowerCase()));
  const missingColumns = REQUIRED_PRODUCT_COLUMNS.filter((column) => !existingColumns.has(column));

  if (missingColumns.length > 0) {
    const columnList = missingColumns.join(', ');
    throw new Error(
      `[StartupCheck] Product schema drift detected. Missing Product column(s): ${columnList}. ` +
      'Run "cd server && npx prisma migrate deploy && npx prisma generate" before starting the API.',
    );
  }
};
