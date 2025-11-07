import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function main() {
  console.log('🔍 INSPECTING DATABASE SCHEMA...\n');
  
  // Get all tables
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  
  console.log('📋 TABLES FOUND:');
  tables.forEach(t => console.log(`  - ${t.table_name}`));
  
  // Get WhatsAppInstance columns
  console.log('\n\n📊 WHATSAPP_INSTANCES TABLE:');
  const whatsappCols = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'whatsapp_instances' 
    ORDER BY ordinal_position
  `;
  whatsappCols.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
  });
  
  // Get Conversations columns
  console.log('\n\n📊 CONVERSATIONS TABLE:');
  const convCols = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'conversations' 
    ORDER BY ordinal_position
  `;
  convCols.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
  });
  
  // Get Messages columns
  console.log('\n\n📊 MESSAGES TABLE:');
  const msgCols = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'messages' 
    ORDER BY ordinal_position
  `;
  msgCols.forEach(col => {
    console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'}`);
  });
  
  // Get constraints
  console.log('\n\n🔐 UNIQUE CONSTRAINTS:');
  const constraints = await prisma.$queryRaw<Array<{ constraint_name: string; table_name: string; column_name: string }>>`
    SELECT 
      tc.constraint_name, 
      tc.table_name, 
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' 
      AND tc.constraint_type = 'UNIQUE'
      AND tc.table_name IN ('whatsapp_instances', 'conversations', 'messages')
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
  `;
  
  const grouped = constraints.reduce((acc, curr) => {
    const key = `${curr.table_name}.${curr.constraint_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr.column_name);
    return acc;
  }, {} as Record<string, string[]>);
  
  Object.entries(grouped).forEach(([key, cols]) => {
    console.log(`  - ${key}: [${cols.join(', ')}]`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
