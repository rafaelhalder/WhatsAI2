import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando se grupos estão com fotos de membros...\n');
  
  // Buscar grupos que têm foto
  const groupsWithPhoto = await prisma.conversation.findMany({
    where: { 
      isGroup: true,
      contactPicture: { not: null }
    },
    select: {
      id: true,
      remoteJid: true,
      contactName: true,
      contactPicture: true,
      isGroup: true
    }
  });
  
  console.log(`📊 Analisando ${groupsWithPhoto.length} grupos com foto:\n`);
  
  let potentialIssues = 0;
  
  for (const group of groupsWithPhoto) {
    // Verificar se a URL da foto é de perfil individual (@s.whatsapp.net ou @lid)
    const photoUrl = group.contactPicture || '';
    
    // URLs de grupos geralmente contêm @g.us no path ou são diferentes de perfis individuais
    // URLs individuais tipicamente têm números de telefone no path
    const hasIndividualMarkers = photoUrl.includes('@s.whatsapp.net') || photoUrl.includes('@lid');
    const hasPhonePattern = /\/\d{10,15}[-@]/.test(photoUrl);
    const hasGroupMarker = photoUrl.includes('@g.us');
    
    const looksLikeIndividualPhoto = hasIndividualMarkers || (hasPhonePattern && !hasGroupMarker);
    
    if (looksLikeIndividualPhoto) {
      potentialIssues++;
      console.log(`⚠️  POSSÍVEL PROBLEMA:`);
      console.log(`   Grupo: ${group.contactName}`);
      console.log(`   JID: ${group.remoteJid}`);
      console.log(`   URL: ${photoUrl.substring(0, 100)}...`);
      console.log('');
    } else {
      console.log(`✅ ${group.contactName}`);
      console.log(`   JID: ${group.remoteJid}`);
      console.log(`   URL: ${photoUrl.substring(0, 80)}...`);
      console.log('');
    }
  }
  
  console.log(`\n📊 RESULTADO:`);
  console.log(`   Total de grupos com foto: ${groupsWithPhoto.length}`);
  console.log(`   Possíveis problemas (foto de membro): ${potentialIssues}`);
  console.log(`   ✅ Grupos com foto correta: ${groupsWithPhoto.length - potentialIssues}`);
  
  if (potentialIssues === 0) {
    console.log(`\n✅ Todos os grupos parecem estar com fotos corretas!`);
  } else {
    console.log(`\n⚠️  ${potentialIssues} grupo(s) podem estar com foto de membro em vez de foto do grupo`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
